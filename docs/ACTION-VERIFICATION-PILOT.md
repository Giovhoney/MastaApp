# MastaApp local pilot: per-transaction PIN verification

MastaApp opens directly to the dashboard. Viewing inventory, racks, ink lookup, and reports requires no login or session. Users create their own account from the dashboard's **Create employee account** button using only first name and a six-digit PIN. The first name is unique (case-insensitive) and the PIN is stored as a salted scrypt hash.

When a user confirms a MySQL inventory change (RECEIVE, RECEIVE_BULK, CHECKOUT, RETURN, MOVE, PURGE), a small modal asks for their first name and PIN. The API verifies the credentials **on each write request** before changing inventory. The authenticated account ID and name are used for the movement audit; client-supplied employee IDs are ignored. Canceling the modal does not save a transaction. Failed verification leaves the modal open to retry. No session cookies, login page, or sign-out process are used.

This is a fictional-data local pilot, not production authorization. The six-digit PIN and open self-registration require stronger centralized rate limiting, role restrictions and account recovery before any public deployment. Production remains blocked by the existing guard. The old login-screen documentation and signing-key configuration are obsolete.
