async function processResponse(response) {
    let data_p = '';
    await getResponse(response, parsedResponse => {
        let word = parsedResponse.response;

        if (word !== undefined) {
            data_p += word;
        }
       
    });
    console.log(data_p);
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
            try {
                const parsedResponse = JSON.parse(line);
                callback(parsedResponse); // Process each response word
            } catch (e) {
                console.error('Error parsing JSON:', e);
            }
        }
    }

    // Handle any remaining line
    if (partialLine.trim() !== '') {
        try {
            const parsedResponse = JSON.parse(partialLine);
            callback(parsedResponse);
        } catch (e) {
            console.error('Error parsing remaining JSON:', e);
        }
    }
}


const prompt = "You are experienced in writing Bash commands(mac) without explanations. If the user asks you to perform any task or execute any action, you will provide the corresponding Bash commands. If the user requests you to write or perform a task involving Python code, you will write the Python code in a Bash script format, save it to a file, and then execute it. The user will provide feedback on each command you give, including the actual output. If any issues arise, you will revise the code to resolve them. To facilitate debugging, ensure that each Bash command includes some form of status reporting. if every thing looks great just say DONE, ignore minior issues;........ ### task \n what is my battery percentage as im in mac os"

const data = { model: "gemma:2b", prompt: prompt };

async function postRequest(data) {
    const URL = `http://localhost:11434/api/generate`;

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json(); // Or response.text
            console.error('Error response:', errorData);
        }

        return response; // Assuming the API returns JSON
    } catch (error) {
        console.error('Request failed:', error);
        throw error; // Rethrow or handle as needed
    }
}

// Call the postRequest function with the data
postRequest(data)
    .then(response => processResponse(response))
    .catch(error => console.error('Error in postRequest:', error));
