/* =============================================================
   LAKEVIEW UMC - SITE CONFIG
   This is the master Google Sheet that feeds the website.
   =============================================================

   One sheet, multiple tabs:
     - Photos tab (gid below): maps each photo placeholder to a Google Drive link
     - Events tab (named "Events"): calendar + homepage events

   To swap a photo: paste a Google Drive share link ("Anyone with the link")
   into the "Replace with this photo" column. The site updates automatically.
*/
window.LV_CONFIG = {
  sheetId: "1Xe8ERT4hDJEoFLefh6s053wWTHM7rkwfPhPjCpfQhys",  // master sheet
  eventsGid: "0",            // tab id (gid) that holds calendar events
  photosGid: "271429802",    // tab id (gid) that holds the photo links
  hidePastEvents: true       // automatically hide events whose date has passed
  // Only rows with Published = YES (column G) appear on the site.
};
