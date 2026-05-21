
REVOKE EXECUTE ON FUNCTION public.award_report_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_favorite_badge() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_monthly_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_leaderboard() TO authenticated;
