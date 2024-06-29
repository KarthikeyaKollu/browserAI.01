import "./models.mjs"; // Importing the models module for LLM interactions

// Log to indicate the extension has started
chrome.runtime.onInstalled.addListener(() => {
  console.log("installed");
  

  // Adding the extension to the browser's context menu
  chrome.contextMenus.create({
    id: 'openSidePanel', // Unique ID for the context menu item
    title: 'Open side panel', // Text shown in the context menu
    contexts: ['all'] // Available in all contexts (pages)
  });
});

// Listener for clicks on the context menu items
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Check if the clicked menu item is 'openSidePanel'
  if (info.menuItemId === 'openSidePanel') {
    // Opens the side panel in the current window
    chrome.sidePanel.open({ windowId: tab.windowId });
  }

});

// Listener for messages from the web UI (e.g., button clicks)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check if the message action is 'openSidePanel'
  if (message.action === 'openSidePanel') {
    // Get the current window
    chrome.windows.getCurrent((window) => {
      // Open the side panel for the current window
      chrome.sidePanel.open({ windowId: window.id });
    });
  }
});

// Listener for keyboard shortcuts (e.g., cmd+shift+Left / ctrl+shift+Left)
chrome.commands.onCommand.addListener((command) => {
  // Check if the command is 'open_side_panel'
  if (command === 'open_side_panel') {
    // Get the current window
    chrome.windows.getCurrent((window) => {
      // Open the side panel for the current window
      chrome.sidePanel.open({ windowId: window.id });
    });
  }
});

// Setting side panel behavior to open when the extension action is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .then(() => console.log('Side panel behavior set successfully.')) // Success message
  .catch(error => console.error('Error setting side panel behavior:', error)); // Error handling


// chrome.contextMenus.create({
//   id: "openTab",
//   title: "Open Tab",
//   contexts: ["all"]
// });
// function openSidePanel() {
//   let panel = document.createElement('div');
//   panel.id = 'my-side-panel';
//   panel.style.width = '300px';
//   panel.style.height = '100%';
//   panel.style.position = 'fixed';
//   panel.style.top = '0';
//   panel.style.right = '0';
//   panel.style.zIndex = '1000';
//   panel.style.backgroundColor = 'white';
//   panel.innerHTML = '<iframe src="panel.html" style="width:100%;height:100%;border:none;"></iframe>';
//   document.body.appendChild(panel);
// }


// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   if (info.menuItemId === "openPanel") {
//     // Open the side panel with your panel.html file.
//     // Note: The sidePanel API is experimental and may not be available in all versions of Chrome.
//     //chrome.sidePanel.setPanel({ panel: chrome.runtime.getURL("panel.html") }).catch((error) => console.error(error));
//     openSidePanel();
//   } else if (info.menuItemId === "openTab") {
//     // Open a new tab with your panel.html file.
//     chrome.tabs.create({ url: chrome.runtime.getURL("panel.html") });
//   }
// });




// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === 'OPEN_PANEL') {
//     // Check if Chrome extension supports side panels (Manifest Version 3 requirement)
//     if (chrome. sidePanel) {
//       chrome.tabs.create({
//         url: chrome.runtime.getURL('panel.html'),
//       })
//       .then(() => {
//         console.log("Side panel opened successfully!");
//       })
//       .catch(error => {
//         console.error("Error opening side panel:", error);
//       });
//     } else {
//       console.warn("Side panels not supported in this Chrome version.");
//     }
//   }
// });

// Set side panel behavior to open on action click





  ////////////////////////////////
