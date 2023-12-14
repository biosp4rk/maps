# GBA Metroid Data Maps

Source code for app at [labk.org/maps](https://labk.org/maps/)

## Filter Options
- Filters are case insensitive
- Separate search terms with spaces
- Search for addresses by putting `=` before a hex address
- Search for address ranges by putting `>`, `<`, `>=`, or `<=` before a hex address
- Search for entries near an address by putting `~` before a hex address
- Search for phrases by putting `"` around the phrase
- Search for regex patterns by putting `/` around the pattern
- Put `-` before a term, phrase, or pattern to exclude it from the results
- Clear a filter by pressing `esc`

### Examples
- `=3897C`
  - Entry with the address 0x3897C
- `<=A8D3C`
  - Entries with an address of 0xA8D3C or less
- `>=42D74 <43788`
  - Entries with an address between 0x42D74 and 0x43788
- `~43788`
  - Entry at 0x43788 (if an entry matches) and the entries before and after
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
- Filter by category, type, label, and/or notes
