# BrowserAI (Ollama WebUI)

## Overview
BrowserAI (Ollama WebUI) is a Chrome extension that provides quick access to your favorite local Language Model (LLM) directly from your browser. With features like open-source chat integration, mail reply suggestions, and more, it's designed to enhance your browsing experience with AI capabilities.

[Chat Interface Overview](https://github.com/KarthikeyaKollu/browserAI.01/assets/108949445/59112bd5-07db-4425-a968-e4e289c17524)

## Features
- **Open Side Panel:** Access your LLM with a side panel using `Ctrl+Shift+Left` (or `Command+Shift+Left` on macOS).
- **Contextual Interaction:** Select and interact with parts of websites for enhanced browsing.
- **Email Integration:** Compose and reply to emails with AI-generated suggestions in Gmail.
- **Google Search Enhancements:** Improved interaction with search results using marked.js and Prism.js.
- **Local LLM Integration:** Communicates with a local instance of Ollama for AI responses.

## Chat Interface
The Chat Interface is a key feature of BrowserAI, enabling seamless interaction with Ollama LLMs directly from your browser.

### Features
- **Chat with Ollama LLMs:** Interact with local language models for insightful responses and suggestions.
- **Contextual Website Chat:** Engage in conversations about the content of the current webpage.
- **Customizable Prompts:** Generate replies and posts based on selected text or specific prompts.
- **Integration with Multiple Platforms:** Use within Gmail, Google Search, and more.

### Usage
- **Chat Window:** Easily accessible through the side panel.
- **Interactive Suggestions:** Get real-time responses and suggestions based on the context of the webpage.




## More AI Features

- **GoogleResultsComponent.js:** Enhances Google search results.
    [Chat Interface Overview](https://github.com/KarthikeyaKollu/browserAI.01/assets/108949445/f9389e15-bcbf-4d7e-82bf-75915551b0f4)


- **EmailComponent.js:** Adds AI capabilities to Gmail.
  
  [Chat Interface Overview](https://github.com/KarthikeyaKollu/browserAI.01/assets/108949445/0eaf06b6-a2ae-4b18-9f7c-27d7a95309c5)


  [Chat Interface Overview](https://github.com/KarthikeyaKollu/browserAI.01/assets/108949445/717713bc-7169-48d5-b63b-4c8f8a2395bc)
  
  [Chat Interface Overview](https://github.com/KarthikeyaKollu/browserAI.01/assets/108949445/d5ae4288-01e4-4def-becd-9f43a9dd51d9)













## Installation
1. Clone or download the repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked" and select the extension directory.

## Permissions
- **Storage:** For saving settings and preferences.
- **Side Panel:** To display the AI interface.
- **Context Menus:** For additional options in the right-click menu.
- **Declarative Net Request:** For handling API requests.
- **Scripting and Active Tab:** To modify content on web pages.
- **System Information:** To optimize AI performance based on CPU and memory usage.

## API Integration
The extension communicates with a local Ollama instance via the following endpoints:
- `http://localhost:11434/api/tags`
- `http://localhost:11434/api/generate`

## How to Use
1. Open the side panel using `Ctrl+Shift+Left` (or `Command+Shift+Left` on macOS).
2. Start chatting with Ollama LLMs or engage with the current website content.
3. Use the provided suggestions or prompts for quick interactions.

# Installing Ollama

<img height="500px"  alt="SCR-20240702-dejr" src="https://github.com/KarthikeyaKollu/browserAI.01/assets/108949445/0dd336a7-b0d0-4565-9d8b-f3d430cbcee0">

If you encounter any errors like above, ensure that Ollama is installed. Follow these steps to install Ollama and pull the necessary models:




### Installation Steps

1. **Download Ollama**
   - Visit the [official Ollama website](https://ollama.com/download) to download the latest version for your operating system.

2. **Install Ollama**
   - Follow the installation instructions specific to your OS (Windows, macOS, or Linux).

3. **Verify Installation**
   - Open your terminal and run the following command to verify that Ollama is installed:
     ```bash
     ollama --version
     ```

4. **Pull Models**
   - Once Ollama is installed, you can pull the required models by running:
     ```bash
     ollama pull <model-name>
     ```
   - Replace `<model-name>` with the specific model you need (e.g., `ollama/llm`).

### Example Commands
- Pulling a language model:
  ```bash
  ollama pull gemma:7b
## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or suggestions.

## License
This project is licensed under the MIT License.

---

Enjoy using BrowserAI (Ollama WebUI) and enhance your browsing experience with AI!
