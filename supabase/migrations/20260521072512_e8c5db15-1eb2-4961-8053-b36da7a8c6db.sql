
REVOKE EXECUTE ON FUNCTION public.get_admin_overview() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_daily_active_users(int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_top_viewed_stations(int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_search_heatmap() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_verify_report(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reject_report(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_search_users(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_active_users(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_viewed_stations(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_search_heatmap() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text) TO authenticated;
