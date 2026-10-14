# SQLite demo deployment boundary

The Next.js product uses SQLite plus non-public local evidence files for a **single application instance** only. Set `TOTORO_DATA_DIR` to a persistent writable volume; startup fails with a clear error if the directory or database cannot be initialized.

The deployment must preserve that directory across process restarts. Ephemeral/serverless filesystems, multiple independent instances, shared network deployments, authentication, and PostgreSQL are not supported by this demo. The signed `totoro_demo_workspace` cookie scopes browser-local demo data; it is not a login or an authorization mechanism.

Original uploads are stored below `TOTORO_DATA_DIR/uploads`, never under Next.js `public/`, and are addressed by generated IDs rather than user paths.
