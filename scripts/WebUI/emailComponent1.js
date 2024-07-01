// Function to wait for an element to appear in the DOM
function waitForElement(selector, callback) {
    const interval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
            clearInterval(interval); // Stop checking once the element is found
            callback(element); // Execute the callback with the found element
        }
    }, 500); // Check every 500ms
}






// Function to add quick reply buttons to the email interface
async function addReply(reply) {
    const con = `
      <div class=" generate-reply-container">
          <span class="reply-reply" data-prompt="Write a simple and crisp reply in less than 50 words saying yes or replying affirmatively to the other person">Reply "Yes"</span>
          <span class="reply-reply text-red-500" data-prompt="Write a simple and crisp reply in less than 50 words saying no or replying negatively (or declining) to the other person">Reply "No"</span>
      </div>`;

    console.log(reply);
    const checkReplyComponent = reply.querySelector('.generate-reply-container');
    if (!checkReplyComponent) {
        reply.insertAdjacentHTML('afterbegin', con);

        const emailBodyElement = document.querySelector('.ii.gt .a3s.aiL');
        let contextEmail = "";
        if (emailBodyElement) {
            contextEmail = emailBodyElement.innerText.toString(); // Get email content
        }

        const replies = document.querySelectorAll(".reply-reply");
        console.log(replies);
        const clickSimulate = document.querySelector('.ams.bkH');
        replies.forEach(btn => {
            btn.addEventListener('click', () => {
                if (clickSimulate) {
                    clickSimulate.click(); // Simulate click to open the reply area
                }
                const prompt = btn.dataset.prompt;
                const fullPrompt = `
                  You are a helpful assistant. Your task is to generate a professional email reply based on the provided context and the user's choice. Ensure the reply is clear, formal, and appropriate for professional communication. Don't give any explanation or notes.

                  Generate an email reply based on the following context and user's choice:

                  Context: ${contextEmail}

                  User's choice: ${btn.dataset.prompt}
                \`\`\`plainText
                  {your response should be within this}
                  \`\`\`
              `;
                sendDataToBackgroundCompose(fullPrompt, ""); // Send the prompt to the background script
            });
        });
    }
}




// Function to add email composition interface
async function addEmailComposeComponent(d) {
    // HTML structure for the compose interface
    const content = `<div class="my-extension">
      <div class="compose-container fade-in">
          <div class="generate-compose">
              <span class="reply-compose" data-prompt="Write a simple and crisp reply in less than 50 words saying yes or replying affirmatively to the other person">Rewrite ✍🏼</span>
              <span class="text-yellow-500 reply-compose" data-prompt="Write a professional reply to follow up on the points mentioned in the previous messages">Create <span class="text-blue">✨</span></span>
          </div>
          <div class="create-compose">
              <span class="back">←</span>
              <input type="text" placeholder="Write with Ai" class="input-prompt">
              <img src="https://img.icons8.com/?size=100&id=g8ltXTwIfJ1n&format=png&color=000000" class=" generate" width="50px" height="50px"/>
          </div>
      </div>
      <button id="toggleButton" class=">&#x25B6;</button>
  </div>`;

    const newDiv = document.createElement('div');
    newDiv.classList.add('absolute', 'bottom-0', 'left-0', 'w-full', 'rounded-lg', 'z-50');
    d.classList.add('relative');
    d.appendChild(newDiv);
    newDiv.innerHTML = content;

    const container = d.querySelector(".compose-container");
    let isExpanded = true;

    const toggleButton = newDiv.querySelector('#toggleButton');
    toggleButton.addEventListener('click', () => {
        if (isExpanded) {
            // Shrink to the right
            container.classList.add('hidden');
            container.classList.remove('fade-in');
            newDiv.classList.remove('w-full', 'left-0');
            newDiv.classList.add('w-1/4', 'right-0');
            toggleButton.innerHTML = '&#x25C0;'; // Change button arrow to point left
        } else {
            // Expand to the left
            container.classList.remove('hidden');
            container.classList.add('fade-in');
            newDiv.classList.remove('w-1/4', 'right-0');
            newDiv.classList.add('w-full', 'left-0');
            toggleButton.innerHTML = '&#x25B6;'; // Change button arrow to point right
        }
        isExpanded = !isExpanded;
    });

    suggestReplyForCompose(d); // Call function to handle reply generation
}

// Function to suggest replies based on user input
async function suggestReplyForCompose(d) {
    const generateReply = d.querySelector(".generate-compose");
    const createReply = d.querySelector(".create-compose");
    const replies = d.querySelectorAll(".reply-compose");

    await delay(2000); // Delay for loading
    const context_email_div = d.querySelector('.Am.aiL.Al.editable.LW-avf.tS-tW');
    console.log(context_email_div);
    const toggleButton = d.querySelector('#toggleButton');

    let prompt = '';

    replies.forEach(btn => {
        btn.addEventListener('click', () => {
            const context_email = context_email_div.textContent.toString();
            prompt = btn.dataset.prompt;
            if (btn.textContent.includes("Create")) {
                generateReply.classList.add('fade-out');
                //   generateReply.classList.remove('fade-');


                setTimeout(() => {
                    generateReply.classList.add('hidden');
                    generateReply.classList.remove('fade-out');
                    createReply.classList.remove('hidden');
                    createReply.classList.add('fade-in', 'flex');
                }, 500);
            } else {
                const fullPrompt = `You are a helpful assistant. Your task is to rewrite the provided email to improve its clarity, professionalism, and conciseness. Ensure the rewritten email is formal and appropriate for professional communication. Don't give any explanation or notes.

              Please rewrite the following email:
              ${context_email}

                 \`\`\`
                  {your response should be within this}
                  \`\`\`
              `;

                sendDataToBackgroundCompose(fullPrompt, d);
            }
        });
    });

    const generate = d.querySelector(".generate");
    const back = d.querySelector(".back");
    if (generate) {
        await delay(1000);
        const message_div1 = d.querySelector('.Am.aiL.Al.editable.LW-avf.tS-tW');
        const input = d.querySelector(".input-prompt");
        if (input) {
            input.addEventListener('click', (event) => {
                event.stopPropagation();
                input.focus();
            });

            message_div1.addEventListener('click', (event) => {
                if (event.target === input) {
                    event.stopPropagation();
                }
            });

            input.addEventListener('keydown', (event) => {
                input.focus();
                if (event.key === 'Enter') {

                    event.preventDefault();

                }

            });

            input.addEventListener('focus', (event) => {
                event.stopPropagation();
            });
        }

        // Function to handle both click and Enter key events
        function handleGenerateEvent() {
            const data = input.value.trim();
            if (data) {
                sub();
            }
        }

        // Event listener for click on the generate button
        generate.addEventListener('click', handleGenerateEvent);

        // Event listener for Enter key press in the input field
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleGenerateEvent();
            }
        });

        function sub() {
            toggleButton.click();
            const context_email = context_email_div.textContent.toString();
            prompt = input.value;

            const fullPrompt =
                `You are a helpful assistant. Your task is to generate a professional email based on the given context and user instructions. Ensure the email is clear, formal, and appropriate for professional communication. Don't give any explanation or notes.

            Generate an email based on the following context and instructions:
            ${context_email}

            Instructions: ${prompt}

            {your response should be within this}
            `;

            sendDataToBackgroundCompose(fullPrompt, d);
        }



        back.addEventListener('click', () => {
            createReply.classList.add('fade-out');
            setTimeout(() => {
                createReply.classList.add('hidden');
                createReply.classList.remove('fade-out');
                generateReply.classList.remove('hidden');
                generateReply.classList.add('fade-in');
            }, 500);
        });
    }
}

// Function to send data to the background script for processing
async function sendDataToBackgroundCompose(query, d) {
    console.log(query);
    const port = chrome.runtime.connect({ name: 'ollama_port' });

    waitForElement('.Am.aiL.Al.editable.LW-avf.tS-tW', (message) => {
        if (d === "") {
            const toggleButton = document.querySelector('#toggleButton');
            toggleButton.click();
            console.log('in d="empty');
        } else {
            message = d.querySelector('.Am.aiL.Al.editable.LW-avf.tS-tW');
            const toggleButton = d.querySelector('#toggleButton');
            toggleButton.click();
        }

        if (message) {
            message.innerHTML = "";
        }

        if (message) {
            message.innerHTML += `
              <div class="loading-compose fade-in">
                  <div class="animated-gradient slow-animation"></div>
                  <div class="animated-gradient fast-animation"></div>
              </div>`;

            const loading = document.querySelector(".loading-compose");
            port.onMessage.addListener(function (response) {
                if (response.type === 'WORD') {
                    console.log("Received from background:", response);
                    loading.classList.add('fade-out');
                    loading.classList.remove('fade-in');
                    message.textContent += response.resp.replace(/[*`]/g, '');
                } else if (response.type === 'FINISHED') {
                    console.log(response);
                    const parsedcontent = marked.parse(response.resp);
                    message.innerHTML = parsedcontent;
                }
            });
        } else {
            console.error("No message div is found");
        }

        port.postMessage({ type: 'SUGGESTREPLY', query: query });
    });
}

// Utility function to create a delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Function to add compose and reply interfaces to email elements.
 * Retrieves email elements with class '.aO7', adds reply functionality 
 * above existing reply and forward buttons, and adds email composition 
 * component if not already present.
 */
function addDivs() {
    const data = document.querySelectorAll('.aO7');

    // Wait for element '.ip.iq' to appear and add reply functionality
    waitForElement('.ip.iq', (reply) => {
        addReply(reply); // Adds reply functionality above the reply and forward buttons of Gmail reply
    });

    console.log(data);

    // Loop through each email element
    data.forEach((d, i) => {
        if (!d.querySelector('.my-extension')) {
            // If compose component is not already present, add it
            addEmailComposeComponent(d);
        } else {
            console.log("already there at ", i);
        }
    });
}


// Observer to detect changes in the DOM and add interfaces as needed
const observer = new MutationObserver((mutations) => {
    let shouldAddDivs = false;

    mutations.forEach(mutation => {
        if (mutation.addedNodes.length || mutation.removedNodes.length) {
            shouldAddDivs = true;
        }
    });

    if (shouldAddDivs) {
        addDivs();
    }
});

observer.observe(document.body, { childList: true, subtree: true }); // Observe changes in the document body

addDivs(); // Initial call to add the interfaces
