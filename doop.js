
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


// API Function to send a POST request to the Ollama
async function postRequest(data) {
  const URL = `${ollama_host}/api/generate`;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json(); // Or response.text() if not JSON
      document.getElementById('chatlog').innerHTML += `API returned an error: ${errorData.message}`;
    }

    return response; // Assuming the API returns JSON
  } catch (error) {
    document.getElementById('chatlog').innerHTML += 'Failed to post request ' + ollama_host + ' ';
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

  chrome.storage.local.set({ 'model': model }, () => {
    console.log('Model updated manually to ' + model);
  });
  MODEL_ID = model;
  updateSettingString();

}

// Fetch available models and populate the dropdown
async function populateModels() {
  //document.getElementById('send-button').addEventListener('click', submitRequest);

  try {
    const data = await getModels();

    const selectElement = document.getElementById('model-select');

    // set up handler for selection
    selectElement.onchange = (() => updateModelInQueryString(selectElement.value));

    data.models.forEach((model) => {
      const option = document.createElement('option');
      option.value = model.name;
      option.innerText = model.name;
      selectElement.appendChild(option);
    });



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
    document.getElementById('chatlog').innerHTML += '<br></br> Unable to communitcate with Ollama: ' + error.message;


    document.getElementById('chatlog').innerHTML += notFoundString;
  }
}

//DEPRECATED
async function getApiKey() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('api_key', (result) => {
      if (result.api_key) {
        API_KEY = result.api_key;
        resolve();
      } else {
        const apiKeyInput = document.createElement('input');
        apiKeyInput.type = 'text';
        apiKeyInput.id = 'api-key-input';
        const apiKeyButton = document.createElement('button');
        apiKeyButton.textContent = 'Guardar API KEY';
        apiKeyButton.addEventListener('click', () => {
          API_KEY = document.getElementById('api-key-input').value;
          chrome.storage.local.set({ 'api_key': API_KEY }, () => {
            apiKeyDiv.style.display = 'none';
            resolve();
          });
        });
        const apiKeyDiv = document.createElement('div');
        //const apiKeyDiv = document.getElementById('api-key');

        apiKeyDiv.appendChild(apiKeyInput);
        apiKeyDiv.appendChild(apiKeyButton);
        apiKeyDiv.style.display = 'block';
      }
    });
  });
}

//DEPRECATED
async function sendMessage(prompt) {
  //const completePrompt = conversationHistory + '\nHuman: ' + prompt;
  conversationHistory += '\nHuman: ' + prompt + "\nOpen-OS:";
  const response = await fetch(`https://api.openai.com/v1/engines/${MODEL_ID}/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      prompt: conversationHistory,
      max_tokens: 516,
      temperature: 0.9,
      n: 1,
    }),
  });
  const data = await response.json();
  if (data.choices && data.choices.length > 0) {
    const botResponse = data.choices[0].text.trim();
    conversationHistory += '\n' + botResponse;
    return botResponse;
  } else {
    document.getElementById('chatlog').innerHTML += 'API Error: ' + JSON.stringify(data);
    throw new Error('API Error: ' + JSON.stringify(data));


  }
}

const chatlog = document.getElementById('chatlog');
const settings = document.getElementById('settings');
const promptInput = document.getElementById('prompt');
const context_prompt = document.getElementById('context-prompt')
const submitButton = document.getElementById('submit');
const closeButton = document.getElementById('close');

async function submitPrompt() {

  const response = await sendMessage(prompt);
  const responseEntry = document.createElement('p');
  responseEntry.textContent = response;
  chatlog.appendChild(responseEntry);

}


// Function to handle the user input and call the API functions
async function submitRequest() {
  const suggestion = document.querySelector('.suggestion');
 if(!suggestion.classList.contains('hidden')){
  suggestion.classList.add('hidden')
 }
  // window.scrollTo(0, document.body.scrollHeight);

  const input = promptInput.value;
  const context_input = context_prompt.value.toString();

  const selectedModel = document.getElementById('model-select').value;
  const chatlog = document.getElementById('chatlog');
  chatlog.scrollTop = chatlog.scrollHeight
  const loading = document.getElementById('loading');
  let context = chatlog.context;

  context_prompt.classList.add('hidden');
  closeButton.classList.add('hidden')
  // Add user input to chatlog
  const chatEntry = document.createElement('div');

  const uniqueId = Date.now().toString();

  if (context_input.length > 0) {
    chatEntry.innerHTML += `
  <div  class="w-[90%] items-center p-4 bg-indigo-600 mx-auto rounded-bl-lg rounded-tr-lg rounded-tl-lg mb-6 fade-in">
      <div  class="w-full min-h-20 px-3 py-2 rounded-md bg-gray-300 resize-none  border overflow-auto max-h-40 glow">
        ${context_input.toString()}
      </div> 
      <div  class="w-full flex-grow text-white bg-[#8A2BE2] mr-3 resize-none outline-none p-2 fade-in" placeholder="Ask a follow-up">
        ${input.toString()}
      </div>
    
  </div>
      `;


  }
  else {
    chatEntry.innerHTML += `
      <div class="w-[95%]  flex justify-end   mb-6 ">
      
                <span type="text" id="prompt" placeholder="Ask a follow-up" class="fade-in bg-indigo-500 text-end  p-4 test-white rounded-bl-lg rounded-tr-lg rounded-tl-lg max-w-[90%]">
                  ${input.toString()}
                </span>           

          </div>
      `;


  }

  promptInput.value = '';
  context_prompt.value = ''

  chatlog.appendChild(chatEntry);

  // Add LLM response to chatlog (hidden initially)
  const chatResponse = document.createElement('div');
  chatResponse.classList.add('flex', 'justify-start', 'mb-6', 'w-[90%]');
  const chatResponse_p = document.createElement('div');
  chatResponse_p.classList.add('bg-slate-200', 'p-4', 'rounded-tl-lg', 'rounded-tr-lg', 'rounded-br-lg', 'ml-[6%]', 'glow', 'w-[95%]','fade-in');
  chatResponse_p.classList.add('hidden'); // Initially hidden
  chatResponse_p.id = "response_llm"
  chatResponse.appendChild(chatResponse_p);
  chatlog.appendChild(chatResponse);

  loading.classList.remove('hidden');
  loading.classList.add('flex');


  const ollam_email = `

  You are a helpful assistant. Your task is to either rewrite an existing email to improve its clarity and professionalism or generate a new professional email based on user input. Ensure the language is formal and appropriate for professional communication.
  
  I need you to ${input}
  
  Following mail: ${context_input}
  
   <pre>
   {your response should be within this} 
   </pre>
  `
  const ollam_code = `

  You are a knowledgeable coding assistant. Your task is to either optimize an existing code snippet or generate new code based on user input. Ensure the code is efficient, well-commented, and follows best practices for readability and maintainability.
  
  i need you to ${input}
  
  Following code snippet: ${context_input}
  
 
  
  {your response should be within this}
  
  `

const ollama_summary = `
You are a helpful assistant. Your task is to generate a concise and clear summary of the provided text. Ensure the summary captures the main points and key details accurately.

I need you to ${input}  :

${context_input}

\`\`\`plaintext

{your response should be within this}

\`\`\`
`

const basicPrompt = `
You are a knowledgeable assistant. Your task is to provide detailed answers to the following questions. Ensure your responses are clear, accurate, and tailored to each question's requirements.

Questions:
${input}

\`\`\`plaintext

{your response should be within this}

\`\`\`
`
 


console.log(context)
  const data = { model: selectedModel, prompt:basicPrompt, context: context };


  var data_p = ''


  try {

    const response = await postRequest(data);
    await getResponse(response, parsedResponse => {
      let word = parsedResponse.response;

      if (parsedResponse.done) {
        chatlog.context = parsedResponse.context;
        // window.scrollTo(0, document.body.scrollHeight);
      }

      if (word !== undefined) {
        chatResponse_p.innerHTML += word;
        data_p += word;

      }

      loading.classList.add('hidden');
      loading.classList.remove('flex');
      chatResponse_p.classList.remove('hidden'); // Show response after processing
      // window.scrollTo(0, document.body.scrollHeight);

      promptInput.value = '';

    });

    chatResponse_p.innerHTML = marked.parse(data_p);
    console.log(chatResponse_p.innerHTML);
    Prism.highlightAllUnder(chatResponse_p);
    // window.scrollTo(0, document.body.scrollHeight);
    chatResponse_p.classList.remove('glow')
    sendToContent("DONE")
    console.log(chatResponse_p);


  } catch (error) {
    chatlog.innerHTML += error.message;
    chatlog.innerHTML += notResponseString;
  }

}
// submit__end


function sendToContent(message){
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    // Send a message to the content script in the active tab
    chrome.tabs.sendMessage(activeTab.id, { rewrite: message}, (response) => {
        console.log(response);
    });
});
}



submitButton.addEventListener('click', async () => {
  submitRequest();
});

closeButton.addEventListener('click', async () => {
  context_prompt.classList.add('hidden')
  context_prompt.value = ''
  closeButton.classList.add('hidden')
});





// Scroll to bottom of chat log when Enter key is pressed
promptInput.addEventListener('keydown', function(event) {
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
var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
      chatLog.scrollTop = chatLog.scrollHeight;
  });
});

// Configuration of the observer
var config = { childList: true, subtree: true };

// Start observing the target node for configured mutations
observer.observe(chatLog, config);


const suggestions = document.querySelectorAll('.suggestions');
console.log(suggestions)
suggestions.forEach(suggestion=>{
  suggestion.addEventListener('click',()=>{
    console.log(suggestion.textContent.trim())
    const promptInput = document.getElementById('prompt');
    promptInput.value = suggestion.textContent.trim();
    submitRequest();

    
  })
})


function updateSettingString() {

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

function applyTheme(theme) {
  var themeStyle = document.getElementById('theme');
  if (theme == 'retro') {
    themeStyle.href = 'css/retro.css';
  } else if (theme == 'css/dark') {
    themeStyle.href = 'css/dark.css';
  } else {
    themeStyle.href = 'css/light.css';
  }
}

function initScript() {
  MODEL_ID = '';
  populateModels();
  chrome.storage.sync.get(["pre_prompt", "api_key", "ai_engine", "char_selected", "theme"], function (result) {
    conversationHistory = 'open-os: ' + result.pre_prompt;
    API_KEY = result.api_key;
    API_KEY = 'force';
    document.getElementById('chatlog').classList.add('spinner');
    applyTheme(result.theme)
    if (API_KEY == undefined || API_KEY == '' || API_KEY == "undefined") {
      const chatEntry = document.createElement('p');
      chatEntry.textContent = 'open-os: API_KEY not set. Please go to the options page to set it.';
      chatlog.appendChild(chatEntry);
      updateSettingString();
    } else {
      updateSettingString();
    }

  });

}

initScript();





/// context for slecting the content

// document.addEventListener('DOMContentLoaded', () => {
//   // Load the selected text from local storage when the panel is opened
//   chrome.storage.local.get('selectedText', (data) => {
//     if (data.selectedText !== undefined && data.selectedText !== null){
//       console.log(data.selectedText);
//       const context_prompt = document.getElementById('context-prompt');
//       context_prompt.classList.remove('hidden');
//       context_prompt.value = data.selectedText;

//       // Clear the local storage after using the selected text
//       chrome.storage.local.remove('selectedText', () => {
//         if (chrome.runtime.lastError) {
//           console.error('Error clearing local storage:', chrome.runtime.lastError);
//         } else {
//           console.log('Local storage cleared');
//         }
//       });
//     }
//   });
// });
//

// rewrite button click

// document.getElementById('rewrite').addEventListener('click', () => {
//   // Query the active tab to get its ID
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       const activeTab = tabs[0];
//       // Send a message to the content script in the active tab
//       chrome.tabs.sendMessage(activeTab.id, { rewrite: "REWRITE",value:document.getElementById('response_llm').innerText}, (response) => {
//           console.log(response);
//       });
//   });
// });




chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.selectedText) {
    context_prompt.classList.remove('hidden');
    context_prompt.value = changes.selectedText.newValue;
    closeButton.classList.remove('hidden')

  }
  if (areaName === 'local' && changes.mailBody) {
    console.log(changes.mailBody.newValue);
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
          if (codeElement) {
            if (codeElement.classList.length <= 0) {
              codeElement.classList.add('language-javascript');
              Prism.highlightAll(codeElement)

            }
            else {
              var lang = codeElement.classList[0].split("-")[1];
              lang = lang.charAt(0).toUpperCase() + lang.slice(1);

            }
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




// // popup.js

// // popup.js
// function scrolldiv() {
//   var element = document.getElementById("bottom");
//   if (element) {
//     var elementRect = element.getBoundingClientRect();
//     var absoluteElementTop = elementRect.top + window.pageYOffset;
//     console.log(elementRect)
//     window.scrollTo(0, absoluteElementTop);
//   } else {
//     console.log("Element with id 'bottom' not found.");
//   }
// }

// document.addEventListener("DOMContentLoaded", function(event) {
//   scrolldiv();
// });





// document.addEventListener('DOMContentLoaded', () => {
//   chrome.storage.local.get(['cpuUsage', ' memoryUsage'], (result) => {
//     const cpuUsage = result.cpuUsage;
//     const memoryInfo = result.memoryUsage;
//     console.log(memoryInfo,cpuUsage)
    
    
//   });
// });

function startMonitoring() {
  function updateUsage() {
    chrome.system.cpu.getInfo((cpuInfo) => {
      // console.log("CPU Info", cpuInfo);

      // Calculate total CPU usage across all cores
      const totalUsage = cpuInfo.processors.reduce((acc, processor) => {
        return acc + processor.usage.total;
      }, 0);

      // Calculate percentage of total CPU usage
      const totalPercent = ((totalUsage / (cpuInfo.processors.length * cpuInfo.numOfProcessors)) * 100).toFixed(2);
      document.querySelector('#cpuUsage').textContent="--"

      console.log("Total CPU Usage (%)", totalPercent);

      // Store or use these percentages as needed
      chrome.storage.local.set({ cpuUsage: totalPercent });
    });

    chrome.system.memory.getInfo((memoryInfo) => {
      console.log("Memory Info", memoryInfo);

      const usedMemoryGB = (memoryInfo.capacity - memoryInfo.availableCapacity) / (1024 * 1024 * 1024);
      const totalMemoryGB = memoryInfo.capacity / (1024 * 1024 * 1024);
      const usedPercent = ((usedMemoryGB / totalMemoryGB) * 100).toFixed(0);


      document.querySelector('#ramUsage').textContent=usedPercent
    });

    // Schedule the next update after a certain interval (e.g., 10 seconds)
    setTimeout(updateUsage, 3000); // 10 seconds
  }

  // Start initial monitoring
  updateUsage();
}

startMonitoring();