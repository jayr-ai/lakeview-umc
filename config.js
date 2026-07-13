/* =============================================================
   LAKEVIEW UMC - SITE CONFIG
   This is the ONLY file you edit to connect your Google Sheet.
   =============================================================

   HOW TO CONNECT YOUR GOOGLE SHEET (one time):
   1. Make a Google Sheet with a tab named exactly: Events
   2. Row 1 headers (exactly): Date | Title | Description | Image | Link
   3. Share it: Share -> General access -> "Anyone with the link" -> Viewer
   4. Copy the Sheet ID from its URL. Example:
        https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
        the ID is the part between /d/ and /edit  ->  1AbCdEfGhIjKlMnOpQrStUvWxYz
   5. Paste that ID between the quotes below and save.

   Leave sheetId as "" (empty) to keep the built-in example events.
*/
window.LV_CONFIG = {
  sheetId: "",          // <-- paste your Google Sheet ID here
  eventsTab: "Events",  // the tab (sheet) name that holds your events
  hidePastEvents: true  // true = automatically hide events whose date has passed
};
