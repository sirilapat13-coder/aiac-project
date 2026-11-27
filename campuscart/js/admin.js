// admin.js - admin-only data calls for the Admin Dashboard.
// Every function here maps to a SECURITY DEFINER database function (or an
// admin-only RLS read). The database itself checks role = 'admin', so these
// simply fail for anyone who is not an admin.

import { supabase } from './supabaseClient.js';

// All applications, newest-decided first is handled in the page.
// The applications_select_admin policy lets an admin read every row.
// The profile (name, student id, phone) is joined in via the user_id link.
export async function listApplications() {
  const { data, error } = await supabase
    .from('delivery_partner_applications')
    .select(
      'id, status, block_or_hostel, availability_note, reason, admin_note, created_at,' +
      ' profiles:user_id ( full_name, student_id, phone )'
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Approve or reject a pending application. p_note is optional.
export async function reviewApplication(applicationId, decision, note) {
  const { error } = await supabase.rpc('review_delivery_application', {
    p_application_id: applicationId,
    p_decision: decision,
    p_note: note || null
  });
  if (error) throw error;
}

// The list of partners with online status and delivery counts.
export async function listPartners() {
  const { data, error } = await supabase.rpc('admin_list_delivery_partners');
  if (error) throw error;
  return data;
}

// Suspend ('suspended'), reinstate ('approved') or revoke ('revoked').
// A note is REQUIRED by the database for 'suspended' and 'revoked'.
export async function setDeliveryStatus(userId, newStatus, note) {
  const { error } = await supabase.rpc('set_delivery_status', {
    p_user_id: userId,
    p_new_status: newStatus,
    p_note: note || null
  });
  if (error) throw error;
}

// ===== Xerox pricing =====
export async function listXeroxPending() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, customer_name, delivery_location, delivery_fee,' +
            ' xerox_requests ( file_path, original_file_name, print_type, print_sides, paper_size, copies, instructions )')
    .eq('order_type', 'xerox')
    .eq('pricing_status', 'pending_confirmation')
    .order('created_at');
  if (error) throw error;
  return data;
}
export async function xeroxFileUrl(path) {
  const { data, error } = await supabase.storage.from('xerox-files').createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
export async function confirmXeroxPrice(orderId, amount) {
  const { error } = await supabase.rpc('confirm_xerox_pricing',
    { p_order_id: orderId, p_final_amount: amount });
  if (error) throw error;
}
// ===== Medicine approval =====
export async function listInfirmaryPending() {
  const { data, error } = await supabase
    .from('infirmary_requests')
    .select('order_id, tablet_request, approval_status,' +
            ' orders:order_id ( customer_name, delivery_location, created_at )')
    .eq('approval_status', 'pending');
  if (error) throw error;
  return data;
}
export async function reviewInfirmary(orderId, decision, note) {
  const { error } = await supabase.rpc('review_infirmary_request',
    { p_order_id: orderId, p_decision: decision, p_notes: note || null });
  if (error) throw error;
}

// ===== Shops (admin CRUD; shops_admin_all RLS enforces admin) =====
export async function listAllShops() {
  const { data, error } = await supabase.from('shops')
    .select('id, name, slug, category, description, location, opening_hours, is_open, is_active, delivery_fee, sort_order')
    .order('sort_order');
  if (error) throw error;
  return data;
}
export async function createShop(shop) {
  const { error } = await supabase.from('shops').insert(shop);
  if (error) throw error;
}
export async function updateShop(id, patch) {
  const { error } = await supabase.from('shops').update(patch).eq('id', id);
  if (error) throw error;
}
// ===== Products (admin CRUD; products_admin_all RLS enforces admin) =====
export async function listShopProducts(shopId) {
  const { data, error } = await supabase.from('products')
    .select('id, shop_id, name, category, price, emoji, is_available, is_active, sort_order, description')
    .eq('shop_id', shopId)
    .order('sort_order');
  if (error) throw error;
  return data;
}
export async function createProduct(product) {
  const { error } = await supabase.from('products').insert(product);
  if (error) throw error;
}
export async function updateProduct(id, patch) {
  const { error } = await supabase.from('products').update(patch).eq('id', id);
  if (error) throw error;
}