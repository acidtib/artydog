# Releasing ArtyDog

Two channels, both built by `.github/workflows/release.yml`.

## Bleeding-edge

Every push to `main` rebuilds the rolling `bleeding-edge` prerelease. CI
stamps a unique version first (`0.1.0-dev.20260910.gabc1234`), so a build is
identifiable and sorts below the next stable release. Nothing to do by hand.

Pushes that only touch Markdown, `docs/` or the website are skipped. Each
build replaces the previous release, so old assets do not pile up and the
`bleeding-edge` tag moves to the new commit. A newer push cancels a build that
is still running.

## Stable

Make sure the release's changes have entries at the top of `CHANGELOG.md`
(see `AGENTS.md` for the format), then:

```bash
pnpm release:patch   # or release:minor, release:major
git push origin main app-v0.1.1
```

`pnpm release:*` (the scripts live at the workspace root) moves the version in
`apps/desktop/package.json` and the `apps/desktop/src-tauri` manifests
(`tauri.conf.json`, `Cargo.toml`, `Cargo.lock`) together, commits as `config:
bump version to X.Y.Z`, and tags `app-vX.Y.Z`. It also puts the version heading on the unreleased
entries in `CHANGELOG.md`, and stops if there are none. It does not push: pushing the
tag is what publishes the release, so it stays a separate decision. Add
`--dry-run` to rewrite the manifests without committing.

Pushing the tag builds a normal (non-prerelease) GitHub release. Because it
is not a prerelease, it becomes what `releases/latest` resolves to, which is
where the updater looks. The run stops if the tag does not match the version
in the manifests.

## Pipeline

Both channels run lint, tests, `cargo fmt` and `clippy` first, then build
every platform into a draft release and publish it only once all of them have
uploaded, so `releases/latest` never points at a half-finished release.

A stable release's description is that version's section of `CHANGELOG.md`,
and the run fails if the section is missing. A bleeding-edge build lists the
unreleased entries instead.

Publishing a stable release also redeploys the website, which reads the app
version from `apps/desktop/package.json`, so its download links follow the
release without a manual edit.

Third-party actions are pinned to commit SHAs because the build jobs hold the
signing key. Dependabot keeps the pins current.

## The repository has to be public

The updater fetches `latest.json` and the installers anonymously. GitHub
returns 404 for a private repository's release assets, and the download URLs
inside `latest.json` point at `api.github.com`, which needs a token. So a
private repository breaks updating in two places at once, and the app cannot
tell that apart from being offline.

Shipping a token inside the app is not an answer: it would hand every user
access to the repository. If the source ever needs to be private again, the
release artifacts have to move somewhere anonymous, such as a separate public
releases repository or object storage, and `plugins.updater.endpoints` in
`tauri.conf.json` has to follow.

That endpoint contains the repository name, so renaming the repository means
updating it in the same commit. Installs built before a rename keep the old
URL and rely on GitHub redirecting it, which stops the day something else
claims the old name. Do not reuse a retired repository name.

## How updating works

The app checks
`https://github.com/acidtib/artydog/releases/latest/download/latest.json` on
main-window start, and again whenever the user asks from **Settings >
General**. If a newer version is there, a dot appears on the settings cog and
Settings offers to install it and restart; the overlay stays clean during
play. A failed check shows as a quiet note in Settings rather than an error,
because being offline fails the same way as a broken endpoint.

## Signing

Updates must be signed or the app refuses them. The private key is kept
outside this repo and the public half is in `tauri.conf.json`. CI signs with
the repo secrets `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

The public key in the config and the private key in the secret must be two
halves of the same pair. They are only checked against each other when a real
update runs, so a mismatch is silent until it strands an install.

**Losing the private key, or its password, strands every install.** They keep running but can
never auto-update again, because a new key produces signatures the installed
public key rejects. Recovery means every user downloading a fresh installer
by hand. Keep the private key and its password backed up.

## Rotating the signing key

An installed app verifies every download against the public key baked into
**its own** build, not the one in the latest release. So a release signed
with a new key is rejected by everything already installed under the old one.

Stable releases are out (`app-v0.1.1` onward), so rotation now needs the
transition release described below. The short path only applies to a fresh
project with no stable release yet, because then nothing checks signatures:

```bash
pnpm tauri signer generate -w <key-path> -f
gh secret set TAURI_SIGNING_PRIVATE_KEY < <key-path>
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD   # if the key has one
```

Then copy the matching `.pub` file into `plugins.updater.pubkey` in
`tauri.conf.json` and commit. The public key is not a secret. Forgetting this
last step is the easy mistake: CI signs happily with the new key while
installs still trust the old one.

**After installs exist in the wild** it takes a transition release, and the
old private key has to still be available:

1. Generate the new keypair, keeping the old private key.
2. Put the **new** public key in `tauri.conf.json`. Leave the CI secret on
   the **old** private key.
3. Cut a release. It is signed with the old key, so existing installs accept
   it, and once installed they carry the new public key.
4. Now replace `TAURI_SIGNING_PRIVATE_KEY` with the new private key.
5. Every later release signs with the new key.

Anyone who skips the step 3 release is stranded and has to reinstall by hand,
since they never picked up the new public key. Keep step 3 available for a
while rather than deleting it.

## Using a password-protected key

The workflow already passes `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to both
jobs, so adding a password needs no workflow change: generate the key with
one and store it as a secret.

```bash
pnpm tauri signer generate -w <key-path> -f   # prompts for it
gh secret set TAURI_SIGNING_PRIVATE_KEY < <key-path>
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD        # prompts, no echo
```

Let `gh` prompt. `--body ''` hangs waiting on stdin, and `--body 'thepass'`
leaves the password in shell history and in `ps` output while it runs.

Local release builds then need both:

```bash
export TAURI_SIGNING_PRIVATE_KEY_PATH=<key-path>
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=...
pnpm tauri build
```

A forgotten password is exactly as bad as a lost key: see the warning above.

## Caveats

- **Linux: only the AppImage self-updates.** `.deb` installs cannot replace
  themselves and have to be upgraded by hand.
- **Windows installers are unsigned**, so SmartScreen warns on first run.
  Fixing that needs a real code-signing certificate, which costs money. The
  update *payload* signing above is a separate thing and is in place.
- **Windows builds NSIS only**, not MSI. WiX rejects the semver prerelease
  versions the bleeding-edge channel produces, and NSIS is the only Windows
  target the updater can install.
- **An install predating the updater cannot update itself.** The plugin has
  to already be in the running app for it to check. Every existing install
  needs one manual upgrade to a build that includes this, after which
  updating is automatic.
