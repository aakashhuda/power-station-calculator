# Complete Action

1. Read the `@context/current-feature.md` - to understand the goals
2. Review all the code changes made for this feature to add files to git per goals & add commit message separately. Commit message should not include 'Co-Authored by Claude' or anything like this
3. Update the status to Completed
4. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Clear Goals, Notes, References sections (keep placeholder comments)
   - Add feature summary to the END of History
5. Add history of completion of the feature in the file (append only)
6. Commit the reset: `chore: reset current-feature.md and add history after completing [feature]`
7. Merge the feature branch to the main
8. Tag the merge commit on `main` as `phase-N-complete` (per `@context/git-conventions.md`):
   ```
   git tag phase-N-complete
   ```
   Use the phase number from the feature spec's H1 (e.g. `phase-0-complete`, `phase-1-complete`). The tag must point to the merge commit on `main`, not a commit on the phase branch.
9. Remind the user that the tag is local-only until they push. Per `@context/git-conventions.md`, tags do not ride along with a regular `git push` — they need to be pushed explicitly. Surface both the local tag and the two push commands so the user can choose when (and whether) to run them:
   ```
   Local tag:
     phase-N-complete -> <sha>  (on main)

   To publish to the remote (run manually when ready):
     git push origin main
     git push origin phase-N-complete
   ```
   Do not run these push commands yourself — wait for the user to push.
