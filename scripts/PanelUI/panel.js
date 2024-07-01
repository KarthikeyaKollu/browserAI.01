
const notFoundString = `
<p>failed to load</p>
`;

const notResponseString = `
<p>failed to load</p>
`;


let API_KEY = '';
let MODEL_ID = 'llama-3';

let conversationHistory = '';
var version = chrome.runtime.getManifest().version;
var ollama_host = 'http://localhost:11434'

var rebuildRules = undefined;
var status_failed= false
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
  rebuildRules = async function (domain) {
    const domains = [domain];
    /** @type {chrome.declarativeNetRequest.Rule[]} */
    const rules = [{
      id: 1,
      condition: {
        requestDomains: domains
      },
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{
          header: 'origin',
          operation: 'set',
          value: `http://${domain}`,
        }],
      },
    }];
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map(r => r.id),
      addRules: rules,
    });
  }
}

//No warnings for markdown
marked.use({
  mangle: false,
  headerIds: false
});

//set domain ORIGIN to localhost
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
  rebuildRules('localhost');
}

let controller = new AbortController();

// API Function to send a POST request to the Ollama
async function postRequest(data) {
  const URL = `${ollama_host}/api/generate`;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json(); // Or response.text
      showAlert(`API returned an error: ${errorData.message}`)
     
    }

    return response; // Assuming the API returns JSON
  } catch (error) {
    status_failed = true
    if (error.name === 'AbortError') {
      showAlert("Request was aborted")
    } else {
      showAlert('Failed to post request ' + ollama_host + ' ')
      
    }
    throw error; // Rethrow or handle as needed
  }
}


// API Function to stream the response from the server
async function getResponse(response, callback) {
  const reader = response.body.getReader();
  let partialLine = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    // Decode the received value and split by lines
    const textChunk = new TextDecoder().decode(value);
    const lines = (partialLine + textChunk).split('\n');
    partialLine = lines.pop(); // The last line might be incomplete

    for (const line of lines) {
      if (line.trim() === '') continue;
      const parsedResponse = JSON.parse(line);
      callback(parsedResponse); // Process each response word
    }
  }

  // Handle any remaining line
  if (partialLine.trim() !== '') {
    const parsedResponse = JSON.parse(partialLine);
    callback(parsedResponse);
  }
}

// Ollama API request model
async function getModels() {
  const response = await fetch(`${ollama_host}/api/tags`);
  const data = await response.json();
  return data;
}

/*
takes in model as a string
updates the query parameters of page url to include model name
*/
function updateModelInQueryString(model) {
  // make sure browser supports features

  if (window.history.replaceState && 'URLSearchParams' in window) {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("model", model);
    // replace current url without reload
    const newPathWithQuery = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState(null, '', newPathWithQuery);
  }
  chrome.storage.local.set({ 'model': model}, () => {
    console.log('Model updated manually to ' + model);
  });


  MODEL_ID = model;
  updateSettingString();

}

// Fetch available models and populate the dropdown
async function populateModels() {


  try {
    const data = await getModels();

   console.log(data)
    const selectElement = document.getElementById('model-select');


    // set up handler for selection
    selectElement.onchange = (() =>{
      updateModelInQueryString(selectElement.value)
    });

    data.models.forEach((model) => {
      const option = document.createElement('option');
      option.value = model.name;
      option.innerText = model.name;
      selectElement.appendChild(option);
    });

    

//  // In popup.js
// chrome.storage.local.set({ 'model': selectElement.value }, function() {
//   if (chrome.runtime.lastError) {
//     console.error('Error setting model: ' + chrome.runtime.lastError.message);
//   } else {
//     console.log('Model updated manually to ' + selectElement.value);
//   }
// });





    chrome.storage.local.get('model', (result) => {

      if (result.model !== undefined && result.model !== '') {
        selectElement.value = result.model; // set to stored value if present
        MODEL_ID = result.model;
      } else {
        // otherwise set to the first element if exists and update URL accordingly
        selectElement.value = selectElement.options[0].value;; // otherwise set to the first element if exists
        MODEL_ID = selectElement.options[0].value;
      }
      const modelStatusElement = document.getElementById('status');
      const modelStatusElement1 = document.getElementById('status1');

      modelStatusElement.classList.remove('bg-red-500');
      modelStatusElement.classList.add('bg-green-500', "hidden");

      modelStatusElement1.classList.remove('bg-red-500');
      modelStatusElement1.classList.add('bg-green-500');

      document.getElementById('chatlog').classList.remove('spinner');
      updateSettingString();

    });


  }
  catch (error) {
   

    showAlert('Unable to communitcate with Ollama: ' + error.message)
  }
}




const chatlog = document.getElementById('chatlog');
const settings = document.getElementById('settings');
const promptInput = document.getElementById('prompt');
const context_prompt = document.getElementById('context-prompt')
const submitButton = document.getElementById('submit');
const closeButton = document.getElementById('close');
const addContextButton = document.querySelector('.input-context-button');
async function getModelFromStorage() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('model', function(result) {
      const selectedModel = result.model ? result.model.trim() : '';
      resolve(selectedModel);
    });
  });
}
// Function to handle user input and call the API functions
async function submitRequest() {
 if(ongoing){
  return
 }
  const input = promptInput.value;
  if(!context_prompt.classList.contains('hidden')){
    context_prompt.classList.add('hidden')
    closeButton.classList.add('hidden')
  }

  if (input.length <= 0) {
    return;
  }
  // controller.abort();
  // controller = new AbortController();

  handleSuggestion();
  const contextInput = context_prompt.value.toString();
  const selectedModel = document.getElementById('model-select').value;
  const chatlog = document.getElementById('chatlog');
  const loading = document.getElementById('loading');

  const basicPrompt = buildPrompt(contextInput, input);
console.log(selectedModel)


  updateChatlog(chatlog, contextInput, input);
  const [chatResponse, chatResponse_div] = createChatResponseElement(chatlog);
  console.log(chatResponse ,chatResponse_div)


 


  if(status_failed){
    loading.classList.add('hidden');
    loading.classList.remove('flex');
    console.log(status_failed)
  }else{
    loading.classList.remove('hidden');
    loading.classList.add('flex');

  }

  document.getElementById('stop-button').classList.remove('hidden');
  document.getElementById('submit').classList.add('hidden');

  promptInput.value = '';
  context_prompt.value = '';


 const Model = await getModelFromStorage()
 console.log(Model)




if(!Model){
  Model = selectedModel
}
if(chatlog.context || !chatlog.context ){
  document.getElementById('model-select').disabled=true;
  console.log("yess disabled")
}
  const data = { model: Model, prompt: basicPrompt, context: chatlog.context }; 
  

  try {
    const response = await postRequest(data);
    processResponse(response, chatlog, chatResponse, loading,chatResponse_div);
  } catch (error) {
    displayError(error, chatlog);
  }
}

function handleSuggestion() {
 
  const suggestion = document.querySelector('.suggestion');
  if (!suggestion.classList.contains('hidden')) {
    suggestion.classList.add('hidden');
  }
}

function buildPrompt(contextInput, input) {
  if (contextInput.length > 0) {
    return `
      You are a knowledgeable assistant. Your task is to provide detailed answers to the following questions based on the provided context. Ensure your responses are clear, accurate, and tailored to each question's requirements.
      
      Context: ${contextInput}
      
      Questions:
      ${input}
      
   
      \`\`\`{language that is asked}
      {your response should be within this}
      \`\`\`

    `;
  } else {
    return `
      You are a knowledgeable assistant. Your task is to provide detailed answers to the following questions. Ensure your responses are clear, accurate, and tailored to each question's requirements.
       
      Questions:
      ${input}
      

      
       \`\`\`{language that is asked}
      {your response should be within this}
      \`\`\`
      

    `;
  }
}

function updateChatlog(chatlog, contextInput, input) {
  const chatEntry = document.createElement('div');
  if (contextInput.length > 0) {
    chatEntry.innerHTML = `
      <div class="w-[90%] items-center p-2 bg-[#009afd] border border-gray-300 mx-auto rounded-bl-lg rounded-tr-lg rounded-tl-lg mb-4 fade-in">
        <div class="w-full min-h-20 px-3 py-2 rounded-md bg-black text-white resize-none border overflow-auto max-h-40 glow">
          ${contextInput}
        </div> 
        <div class="w-full flex-grow text-white  mr-3 pl-1  text-lg fade-in">
          ${input}
        </div>
      </div>
    `;
  } else {
    chatEntry.innerHTML = `
      <div class="w-[95%] flex justify-end mb-6 fade-in">
        <span type="text" id="prompt" placeholder="Ask a follow-up" class="fade-in bg-[#009afd]  text-end p-2 px-4 test-white rounded-bl-lg text-white rounded-tr-lg text-lg rounded-tl-lg max-w-[90%]">
          ${input}
        </span>
      </div>
    `;
  }
  chatlog.appendChild(chatEntry);
}

function createChatResponseElement(chatlog) {
  const chatResponse_div = document.createElement('div');
  chatResponse_div.classList.add('flex', 'justify-center','items-center','mb-[6%]', 'w-[80%]','glow', 'ml-[6%]','chatResponse');
  const chatResponse = document.createElement('div');
  chatResponse.classList.add('bg-[#333333]', 'p-4', 'rounded-tl-lg', 'rounded-tr-lg', 'rounded-br-lg', 'w-[100%]', 'fade-in','text-white');
  chatResponse_div.classList.add('hidden'); // Initially hidden
  chatResponse.id = "response_llm";
  chatResponse_div.appendChild(chatResponse);
  chatlog.appendChild(chatResponse_div);
  return [chatResponse,chatResponse_div];
}
var ongoing = false;
async function processResponse(response, chatlog, chatResponse, loading,chatResponse_div) {
  let data_p = '';
  await getResponse(response, parsedResponse => {
    let word = parsedResponse.response;

    if (parsedResponse.done) {
      chatlog.context = parsedResponse.context;
    }

    if (word !== undefined) {
      chatResponse.innerHTML += word.replace(/[*`#]/g, '');
      data_p += word;
      ongoing = true
    }
    loading.classList.add('hidden');
    loading.classList.remove('flex');
    chatResponse_div.classList.remove('hidden'); // Show response after processing
  });
  console.log("done generating")
  document.getElementById('stop-button').classList.add('hidden'); // Hide the stop button after the request completes
  document.getElementById('submit').classList.remove('hidden');
  ongoing=false
  chatResponse.innerHTML = marked.parse(data_p);
  console.log(data_p)
  console.log(marked.parse(data_p))
  Prism.highlightAllUnder(chatResponse);
  chatResponse_div.classList.remove('glow');

}

function displayError(error, chatlog) {

}




// function sendToContent(message) {
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     const activeTab = tabs[0];
//     // Send a message to the content script in the active tab
//     chrome.tabs.sendMessage(activeTab.id, { rewrite: message }, (response) => {
//       console.log(response);
//     });
//   });
// }


addContextButton.addEventListener('click',()=>{
  if(context_prompt.classList.contains('hidden')){
    context_prompt.classList.remove('hidden')
    closeButton.classList.remove('hidden')
  }
})
submitButton.addEventListener('click', async () => {
  submitRequest();
});
closeButton.addEventListener('click', async () => {
  context_prompt.classList.add('hidden')
  context_prompt.value = ''
  closeButton.classList.add('hidden')
});

document.getElementById('stop-button').addEventListener('click', () => {
  showAlert("Response it aborted By the user")
  status_failed=true
  ongoing=false
  // Abort the ongoing request
  controller.abort();
  controller = new AbortController();
  const response_llm = document.querySelectorAll("#response_llm");
  const chatResponse_div = document.querySelectorAll('.chatResponse')
  // console.log(response_llm[response_llm.length -1])
  let currResp =chatResponse_div[chatResponse_div.length -1]

  
  currResp.classList.remove('glow')
  currResp.classList.add('remove-glow')
  document.getElementById('stop-button').classList.add('hidden'); // Hide the stop button
  document.getElementById('submit').classList.remove('hidden'); 
  
  // const loading = document.getElementById('loading');
  // loading.classList.add('hidden');
  // loading.classList.remove('flex');
  
  
});

document.addEventListener('DOMContentLoaded', function () {
  const alertDiv = document.getElementById('alert-1');
 
  const closeButton = alertDiv.querySelector('button[data-dismiss-target]');

  closeButton.addEventListener('click', function () {
    alertDiv.classList.remove('hidden')
    
    alertDiv.classList.add('-translate-y-full');
    setTimeout(() => {
      alertDiv.classList.add('hidden');
    }, 500); // Match the duration with transition duration
  });

  // showAlert("Response it aborted")
});



function showAlert(message) {
  const alertDiv = document.querySelector('#alert-1');
  console.log(alertDiv);
  alertDiv.querySelector('.alert-message').textContent = message;
  alertDiv.classList.remove('hidden', '-translate-y-full');
  alertDiv.classList.add('flex');

  // Close the alert after 3 seconds
  setTimeout(() => {
    alertDiv.classList.add('hidden', '-translate-y-full');
    alertDiv.classList.remove('flex');
  }, 3000);
}


// Scroll to bottom of chat log when Enter key is pressed
promptInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault(); // Prevent the default newline behavior

    // Your existing logic for submitting the chat message goes here
    submitRequest()
    // Scroll to the bottom of the chat log
    var chatLog = document.getElementById('chatlog');
    chatLog.scrollTop = chatLog.scrollHeight;
  }
});

// MutationObserver to detect changes in the chat log and scroll to the bottom
var chatLog = document.getElementById('chatlog');
var observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    chatLog.scrollTop = chatLog.scrollHeight;
  });
});

// Configuration of the observer
var config = { childList: true, subtree: true };

// Function to check if bottom is visible
function isBottomVisible(elem) {
  return elem.scrollHeight - elem.scrollTop <= elem.clientHeight;
}

// Check visibility initially and start/stop observer
function checkVisibilityAndStartObserver() {
  if (isBottomVisible(chatLog)) {
    observer.observe(chatLog, config);
  } else {
    observer.disconnect();
  }
}

// Event listener for user scrolling
chatLog.addEventListener('scroll', function() {
  checkVisibilityAndStartObserver();
});

// Check visibility on page load
checkVisibilityAndStartObserver();



const suggestions = document.querySelectorAll('.suggestions');
// const promptInput = document.getElementById('prompt');
console.log(suggestions)
// home buttons suggestion prompts/ example prompts
suggestions.forEach(suggestion => {
  suggestion.addEventListener('click', () => {
    if (suggestion.textContent.includes("webpage")) {
      console.log("clicked cjat with website")
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        // Send a message to the content script
        chrome.tabs.sendMessage(tabs[0].id, { action: "getText" }, function (response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            showAlert("This Feature is not supported or Reload the webpage ")
          } else {
            console.log(response);
            //promptInput.value = response.textContent;
            context_prompt.classList.remove('hidden');
            context_prompt.value = response.textContent;
            closeButton.classList.remove('hidden')
          }
        });
      });

    } else {
      console.log(suggestion.textContent.trim())
      promptInput.value = suggestion.textContent.trim();
    }
    submitRequest();


  })
})


function updateSettingString() {
  const chatlog = document.getElementById('chatlog');
  if(chatLog && chatlog.context){
     
        showAlert("Please reload BrowserAI to apply updates and ensure smooth operation.")

  }
  settings.innerHTML = '' + ollama_host.split("//")[1];

  
}

// Theme updates from options page
chrome.storage.sync.get('theme', function (data) {
  applyTheme(data.theme);
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (changes.theme) {
    applyTheme(changes.theme.newValue);
  }
});

// window.open(chrome.runtime.getURL('options.html'));
function applyTheme(theme) {
  var themeStyle = document.getElementById('theme');
if (theme == 'dark') {
    themeStyle.href = 'css/dark.css';
  } else {
    themeStyle.href = 'css/light.css';
  }
}

function initScript() {
  MODEL_ID = '';
  populateModels();
  chrome.storage.sync.get(["pre_prompt", "api_key", "ai_engine", "char_selected", "theme"], function (result) {
    API_KEY = result.api_key;
    API_KEY = 'force';
    document.getElementById('chatlog').classList.add('spinner');
    applyTheme(result.theme)
    if (API_KEY == undefined || API_KEY == '' || API_KEY == "undefined") {
      const chatEntry = document.createElement('p');
      chatEntry.textContent = 'Orian: API_KEY not set. Please go to the options page to set it.';
      chatlog.appendChild(chatEntry);
      updateSettingString();
    } else {
      updateSettingString();
    }

  });


}

initScript();









chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TEXT_SELECTED') {
     
      context_prompt.classList.remove('hidden');
      context_prompt.value = message.text.toString();
      closeButton.classList.remove('hidden')
  }
  if(message.type==="FOLLOWUP"){
    

      context_prompt.classList.remove('hidden');
      context_prompt.value = message.text;
      closeButton.classList.remove('hidden')
      console.log("loaded")
  
   
    
  }



   
});

document.addEventListener('DOMContentLoaded', () => {


  const addCopyButtonsAndClasses = (nodes) => {
    nodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const preElements = node.matches('pre:not(.content-div)') ? [node] : node.querySelectorAll('pre:not(.content-div)');


        preElements.forEach(pre => {
          pre.classList.add('content-div', 'relative');
          const codeElement = pre.querySelector('code');

          if (codeElement && codeElement.classList.length > 0) {
                       
              var lang = codeElement.classList[0].split("-")[1];
              lang = lang.charAt(0).toUpperCase() + lang.slice(1);

            // adding that copy and language name div above the <pre></pre> tag
            var toolbar = document.createElement("div");
            toolbar.classList.add('bg-black', 'text-white', 'p-2', 'rounded-tr-lg', 'rounded-tl-lg', 'toolbar', 'flex', 'justify-between', 'mt-3')
            pre.parentNode.insertBefore(toolbar, pre);





            // Create and inject copy button if not already present
            if (!pre.querySelector('.copy-button')) {
              const copyButton = document.createElement('button');
              const language = document.createElement('span');
              language.textContent = lang;
              language.classList.add('p-1', 'text-md')
              copyButton.classList.add('copy-button');
              copyButton.textContent = 'Copy';

              toolbar.appendChild(language)
              toolbar.appendChild(copyButton); // Append to body to keep it fixed

              // Add click event listener to the copy button
              copyButton.addEventListener('click', async () => {
                // Get the content of the code element
                const content = codeElement.innerText || codeElement.textContent;
                try {
                  // Use the Clipboard API to write the content to the clipboard
                  await navigator.clipboard.writeText(content);
                  // Optional: Provide feedback to the user
                  copyButton.textContent = 'Copied!';
                } catch (err) {
                  console.error('Failed to copy: ', err);
                }
              });
            }
          }else{
            let pElement = document.createElement('p');
            pElement.textContent = pre.textContent;
            pre.parentNode.replaceChild(pElement, pre);

          }
          
        });
      }
    });
  };

  // Initialize MutationObserver to watch for new elements being added to the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      addCopyButtonsAndClasses(Array.from(mutation.addedNodes));
    });
  });

  // Configure the observer to watch for childList changes
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial call to handle any existing content
  addCopyButtonsAndClasses(document.querySelectorAll('pre:not(.content-div)'));
});





function startMonitoring() {
  function updateUsage() {
    chrome.system.cpu.getInfo((cpuInfo) => {
      if (previousCpuInfo) {
        // Calculate the total usage difference since the last measurement
        let totalCpuTime = 0;
        let totalActiveTime = 0;
        let previousTotalCpuTime = 0;
        let previousTotalActiveTime = 0;
  
        cpuInfo.processors.forEach((processor, index) => {
          const { user, kernel, idle, total } = processor.usage;
          const { user: prevUser, kernel: prevKernel, idle: prevIdle, total: prevTotal } = previousCpuInfo.processors[index].usage;
  
          totalCpuTime += (total - prevTotal);
          totalActiveTime += ((user - prevUser) + (kernel - prevKernel));
          previousTotalCpuTime += (prevTotal - prevIdle);
          previousTotalActiveTime += ((prevUser - prevIdle) + (prevKernel - prevIdle));
        });
  
        // Calculate the percentage of CPU usage
        const usagePercent = ((totalActiveTime / totalCpuTime) * 100).toFixed(1);
        
        document.querySelector('#cpuUsage').textContent = `${usagePercent}`
  
        // Store or use the CPU usage percentage as needed
        chrome.storage.local.set({ cpuUsage: usagePercent });
      }
  
      // Store current CPU info for the next measurement
      previousCpuInfo = cpuInfo;
    });
    

    chrome.system.memory.getInfo((memoryInfo) => {


      const usedMemoryGB = (memoryInfo.capacity - memoryInfo.availableCapacity) / (1024 * 1024 * 1024);
      const totalMemoryGB = memoryInfo.capacity / (1024 * 1024 * 1024);
      const usedPercent = ((usedMemoryGB / totalMemoryGB) * 100).toFixed(1);


      document.querySelector('#ramUsage').textContent = usedPercent
    });

    // Schedule the next update after a certain interval (e.g., 3 seconds)
    setTimeout(updateUsage, 3000); // 3 seconds
  }

  // Start initial monitoring
  updateUsage();
}

startMonitoring();


let previousCpuInfo = null;












/////////
