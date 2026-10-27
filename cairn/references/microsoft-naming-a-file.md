# microsoft-naming-a-file — which file and directory names Windows refuses

**Provenance.** Ingested 2026-10-28 by M031 from
https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file,
downloaded with curl by the agent to `cairn/references/sources/microsoft-naming-a-file.html` (gitignored).
The page's `ms.date` is 2024-08-28. Its source is `desktop-src/FileIO/naming-a-file.md` in MicrosoftDocs/win32-pr.
Pagination: none. The page's section "Naming Conventions" holds every value below.
Extraction: verified 2026-10-28 against the downloaded page, names copied from its text — observed 2026-10-28.

**Citation.** Microsoft. "Naming Files, Paths, and Namespaces". Win32 apps, Microsoft Learn.
https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file.

**Role.** Settles which entry directory names `entryNameProblem` refuses as unsafe on a Windows checkout.
A directory follows the same naming rules as a file, by the page's section "File and Directory Names".

## Extracted values

Section "Naming Conventions":

- Reserved names: CON, PRN, AUX, NUL, COM1 to COM9, COM¹, COM², COM³, LPT1 to LPT9, LPT¹, LPT², and LPT³.
- A reserved name followed by an extension is the same as the reserved name. The page's examples are
  NUL.txt and NUL.tar.gz, both equal to NUL.
- A name must not end with a space or a period. A period as the first character is allowed.
- Names are not case-sensitive by default. The page's example is OSCAR, Oscar, and oscar, which count as one name.
- Reserved characters: `< > : " / \ | ? *`. The characters 0 to 31 are also refused.

The page lists no COM0 or LPT0.

## Traces to

- `src/check/check.ts`: `entryNameProblem` refuses the 22 names CON, PRN, AUX, NUL, COM1 to COM9, and LPT1 to
  LPT9, with or without an extension, and any name that ends with a period. The superscript names and the
  reserved characters fall outside its character pattern.
- `test/check.test.ts`: the reserved-name cases.

## Open questions

- None.
