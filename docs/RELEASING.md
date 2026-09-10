# Releasing ArtyDog

Two channels, both built by `.github/workflows/release.yml`.

## Bleeding-edge

Every push to `main` rebuilds the rolling `bleeding-edge` prerelease. CI
stamps a unique version first (`0.1.0-dev.20260910.gabc1234`), so a build is
identifiable and sorts below the next stable release. Nothing to do by hand.

## Stable

```bash
pnpm release:patch   # or release:minor, release:major
git push origin main app-v0.1.1
```

`pnpm release:*` moves the version in `package.json`, `tauri.conf.json`,
`Cargo.toml` and `Cargo.lock` together, commits as `config: bump version to
X.Y.Z`, and tags `app-vX.Y.Z`. It does not push: pushing the tag is what
publishes the release, so it stays a separate decision. Add `--dry-run` to
rewrite the manifests without committing.

Pushing the tag builds a normal (non-prerelease) GitHub release. Because it
is not a prerelease, it becomes what `releases/latest` resolves to, which is
where the updater looks.

## How updating works

The app checks
`https://github.com/acidtib/potato/releases/latest/download/latest.json` on
main-window start. If a newer version is there, a banner offers "Update &
restart"; the overlay stays clean during play. Failures are silent, so before
the first stable release exists the 404 shows nothing.

## Signing

Updates must be signed or the app refuses them. The keypair lives at
`~/.tauri/artydog.key` and the public half is in `tauri.conf.json`. CI signs
with the repo secrets `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (the password is empty).

**Losing the private key strands every install.** They keep running but can
never auto-update again, because a new key produces signatures the installed
public key rejects. Recovery means every user downloading a fresh installer
by hand. Keep `~/.tauri/artydog.key` backed up.

## Caveats

- **Linux: only the AppImage self-updates.** `.deb` installs cannot replace
  themselves and have to be upgraded by hand.
- **Windows installers are unsigned**, so SmartScreen warns on first run.
  Fixing that needs a real code-signing certificate, which costs money. The
  update *payload* signing above is a separate thing and is in place.
- **Windows builds NSIS only**, not MSI. WiX rejects the semver prerelease
  versions the bleeding-edge channel produces, and NSIS is the only Windows
  target the updater can install.
