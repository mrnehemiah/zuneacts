
-- ZUNE Delivery ETA: driver-entered ETA shared with seller and buyer tracking.
-- Applied to project rpkogiieegqgxqbzwxwo on 2026-11-23.

begin;

alter table public.order_deliveries
  add column if not exists estimated_delivery_at timestamptz,
  add column if not exists eta_updated_at timestamptz;

create index if not exists order_deliveries_estimated_delivery_at_idx
  on public.order_deliveries(estimated_delivery_at)
  where estimated_delivery_at is not null;

create or replace function public.zune_delivery_driver_set_eta(
  p_delivery_id uuid,
  p_estimated_delivery_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  d public.order_deliveries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Tafadhali ingia kwanza.';
  end if;
  if p_estimated_delivery_at is null
     or p_estimated_delivery_at < now() + interval '5 minutes'
     or p_estimated_delivery_at > now() + interval '48 hours' then
    raise exception 'ETA lazima iwe kati ya dakika 5 na saa 48 kutoka sasa.';
  end if;

  select * into d from public.order_deliveries where id = p_delivery_id for update;
  if not found or d.assigned_driver_id <> auth.uid() then
    raise exception 'Oda hii haijapangiwa akaunti yako.';
  end if;
  if d.status not in ('picked_up','in_transit') then
    raise exception 'ETA inaweza kuwekwa baada ya dereva kupokea mzigo.';
  end if;

  update public.order_deliveries
  set estimated_delivery_at = p_estimated_delivery_at, eta_updated_at = now()
  where id = p_delivery_id;

  insert into public.zune_delivery_events(delivery_id,actor_id,event_type,note)
  values (
    p_delivery_id,auth.uid(),'eta_updated',
    'Estimated arrival updated to ' || to_char(p_estimated_delivery_at at time zone 'UTC','YYYY-MM-DD HH24:MI') || ' UTC'
  );

  return jsonb_build_object('ok',true,'delivery_id',p_delivery_id,
    'estimated_delivery_at',p_estimated_delivery_at,'eta_updated_at',now());
end;
$function$;

create or replace function public.zune_delivery_driver_eta()
returns table(delivery_id uuid,estimated_delivery_at timestamptz,eta_updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'Tafadhali ingia kwanza.'; end if;
  return query
  select d.id,d.estimated_delivery_at,d.eta_updated_at
  from public.order_deliveries d where d.assigned_driver_id = auth.uid();
end;
$function$;

create or replace function public.zune_delivery_seller_eta()
returns table(delivery_id uuid,estimated_delivery_at timestamptz,eta_updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare v_owner uuid := public.zune_seller_owner_id();
begin
  if auth.uid() is null then raise exception 'Tafadhali ingia kwanza.'; end if;
  return query
  select d.id,d.estimated_delivery_at,d.eta_updated_at
  from public.order_deliveries d
  where public.zune_is_admin() or d.vendor_id = v_owner;
end;
$function$;

revoke all on function public.zune_delivery_driver_set_eta(uuid,timestamptz) from public, anon;
grant execute on function public.zune_delivery_driver_set_eta(uuid,timestamptz) to authenticated;
revoke all on function public.zune_delivery_driver_eta() from public, anon;
grant execute on function public.zune_delivery_driver_eta() to authenticated;
revoke all on function public.zune_delivery_seller_eta() from public, anon;
grant execute on function public.zune_delivery_seller_eta() to authenticated;

create or replace function public.zune_delivery_buyer_tracking(p_delivery_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Tafadhali ingia kwenye akaunti yako kwanza.';
  end if;

  select jsonb_build_object(
    'delivery_id', d.id,
    'order_numbers', coalesce((
      select jsonb_agg(o.order_number order by o.created_at, o.id)
      from public.orders o where o.checkout_id = d.checkout_id
    ), '[]'::jsonb),
    'status', d.status,
    'delivery_fee', d.delivery_fee,
    'currency', d.currency,
    'estimated_delivery_at', d.estimated_delivery_at,
    'eta_updated_at', d.eta_updated_at,
    'created_at', d.created_at,
    'seller_handover_confirmed_at', d.seller_handover_confirmed_at,
    'driver_pickup_confirmed_at', d.driver_pickup_confirmed_at,
    'driver_delivered_at', d.driver_delivered_at,
    'buyer_confirmed_at', d.buyer_confirmed_at,
    'last_location', case when d.last_latitude is not null and d.last_longitude is not null
      then jsonb_build_object('latitude', d.last_latitude, 'longitude', d.last_longitude, 'updated_at', d.last_location_at)
      else null end,
    'destination', jsonb_build_object(
      'name', c.recipient_name, 'phone', c.recipient_phone,
      'address', c.delivery_address, 'region', c.region, 'district', c.district,
      'latitude', c.latitude, 'longitude', c.longitude
    ),
    'driver', case when dp.user_id is not null then jsonb_build_object(
      'name', dp.full_name, 'phone', dp.phone_number,
      'vehicle_type', dp.vehicle_type, 'vehicle_registration', dp.vehicle_registration
    ) else null end,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_type', e.event_type, 'note', e.note, 'created_at', e.created_at
      ) order by e.created_at asc)
      from public.zune_delivery_events e
      where e.delivery_id = d.id and e.event_type <> 'location_updated'
    ), '[]'::jsonb)
  ) into v_result
  from public.order_deliveries d
  join public.order_checkouts c on c.id = d.checkout_id
  left join public.delivery_driver_profiles dp on dp.user_id = d.assigned_driver_id
  where d.id = p_delivery_id and c.buyer_id = auth.uid();

  if v_result is null then raise exception 'Delivery haijapatikana au si ya akaunti hii.'; end if;
  return v_result;
end;
$function$;

commit;
