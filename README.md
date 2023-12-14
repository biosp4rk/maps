# GBA Metroid Data Maps

Source code for app at [labk.org/maps](https://labk.org/maps/)

## Filter Options
- Separate search terms with spaces
- Search for phrases by putting `"` around the phrase
- Search for regex patterns by putting `/` around the pattern
- Put `-` before a term, phrase, or pattern to exclude it from the results
- Searches are case insensitive

### Examples
- `samus sprite`
  - Entries that contain both "samus" and "sprite"
- `samus -sprite`
  - Entries that contain "samus" but not "sprite"
- `"samus near sprite"`
  - Entries with the exact phrase "samus near sprite"
- `/sprites?/`
  - Entries that contain "sprite" or "sprites"
- `/chozo (statue|ball)/`
  - Entries that contain "chozo statue" or "chozo ball"

## Planned Features
- Option to view all structs and all enums
- Filter by address, category, type, label, and/or notes
