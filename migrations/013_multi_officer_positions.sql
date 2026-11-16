-- v12.4: organizational positions are not unique login seats.
-- Multiple people may hold the same access profile/position (for example
-- a principal officer and deputies). Each account keeps its own identity,
-- enabled state, audit trail and permission profile.
DROP INDEX IF EXISTS users_one_active_chair_per_workspace;
DROP INDEX IF EXISTS account_invitations_one_pending_chair_per_workspace;
