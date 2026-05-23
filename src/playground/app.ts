import { parseOpenAPIObject } from '../core/parser.js';
import { generateSDK } from '../core/generator.js';

// Pre-loaded high-fidelity mock JSON specifications
const SAMPLES = {
  petstore: `{
  "openapi": "3.0.0",
  "info": {
    "title": "PetstoreAPI",
    "version": "1.0.0",
    "description": "A beautiful JSON specification representing a Petstore management catalog."
  },
  "servers": [
    { "url": "https://petstore.swagger.io/v2" }
  ],
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-KEY"
      }
    },
    "schemas": {
      "Pet": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": { "type": "integer", "description": "Unique identifier of the pet" },
          "name": { "type": "string", "description": "Display name of the pet" },
          "category": { "type": "string", "description": "Species category group" },
          "status": { "type": "string", "description": "Availability state" }
        }
      },
      "Error": {
        "type": "object",
        "required": ["code", "message"],
        "properties": {
          "code": { "type": "integer" },
          "message": { "type": "string" }
        }
      }
    }
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets",
        "operationId": "listPets",
        "parameters": [
          { "name": "limit", "in": "query", "required": false, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": {
            "description": "A successful list of pets",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/Pet" }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create a new pet",
        "operationId": "createPet",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/Pet" }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Pet created successfully",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Pet" }
              }
            }
          }
        }
      }
    },
    "/pets/{id}": {
      "get": {
        "summary": "Get pet by ID",
        "operationId": "getPetById",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "Successful retrieval of pet details",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Pet" }
              }
            }
          }
        }
      }
    }
  }
}`,

  "user-api": `{
  "openapi": "3.0.1",
  "info": {
    "title": "UserManagementAPI",
    "version": "2.1.0",
    "description": "An administrative client directory for profile records, access levels, and logs."
  },
  "servers": [
    { "url": "https://api.frankstop.com/v1" }
  ],
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer"
      }
    },
    "schemas": {
      "UserProfile": {
        "type": "object",
        "required": ["uid", "email", "role"],
        "properties": {
          "uid": { "type": "string", "description": "Globally unique ID of the system user" },
          "email": { "type": "string" },
          "role": { "type": "string", "description": "Authorized role e.g. admin, manager" },
          "avatarUrl": { "type": "string", "description": "Custom user profile picture" }
        }
      }
    }
  },
  "paths": {
    "/profiles/me": {
      "get": {
        "summary": "Get current session profile",
        "operationId": "getCurrentUser",
        "responses": {
          "200": {
            "description": "Your current profile schema",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/UserProfile" }
              }
            }
          }
        }
      }
    },
    "/profiles/{uid}": {
      "put": {
        "summary": "Update specific profile settings",
        "operationId": "updateProfile",
        "parameters": [
          { "name": "uid", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/UserProfile" }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated profile successfully",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/UserProfile" }
              }
            }
          }
        }
      }
    }
  }
}`,

  minimal: `{
  "openapi": "3.0.0",
  "info": {
    "title": "AuthService",
    "version": "1.0.0",
    "description": "Minimal auth microservice providing JWT token authorization exchange."
  },
  "servers": [
    { "url": "https://auth.internal.net" }
  ],
  "components": {
    "schemas": {
      "AuthRequest": {
        "type": "object",
        "required": ["username", "password"],
        "properties": {
          "username": { "type": "string" },
          "password": { "type": "string" }
        }
      },
      "AuthResponse": {
        "type": "object",
        "required": ["token", "expiresIn"],
        "properties": {
          "token": { "type": "string" },
          "expiresIn": { "type": "integer" }
        }
      }
    }
  },
  "paths": {
    "/auth/token": {
      "post": {
        "summary": "Exchange credentials for JWT token",
        "operationId": "exchangeToken",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/AuthRequest" }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Token granted successfully",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/AuthResponse" }
              }
            }
          }
        }
      }
    }
  }
}`
};

// UI State
let currentLang: string = 'ts';
let parsedIR: any = null;
let activeFilesList: { path: string; content: string }[] = [];
let currentActiveFilePath: string = '';

// DOM Elements
const specEditor = document.getElementById('spec-editor') as HTMLTextAreaElement;
const sampleSelector = document.getElementById('sample-spec-select') as HTMLSelectElement;
const statusBar = document.getElementById('parse-status-bar') as HTMLDivElement;
const statusIcon = statusBar.querySelector('.status-icon') as HTMLSpanElement;
const statusMessage = document.getElementById('status-message') as HTMLSpanElement;

const tabButtons = document.querySelectorAll('.tab-btn');
const tabNav = document.querySelector('.tabs-nav') as HTMLElement;
const fileListContainer = document.getElementById('generated-files-list') as HTMLUListElement;
const codeViewer = document.getElementById('code-viewer') as HTMLElement;
const copyBtn = document.getElementById('copy-code-btn') as HTMLButtonElement;
const copyToast = document.getElementById('copy-toast') as HTMLDivElement;

// Set up sample selector
sampleSelector.addEventListener('change', () => {
  const selected = sampleSelector.value as keyof typeof SAMPLES;
  if (SAMPLES[selected]) {
    specEditor.value = SAMPLES[selected];
    triggerCompilation();
  }
});

// Setup dynamic editor keystroke compilations
specEditor.addEventListener('input', () => {
  triggerCompilation();
});

// Initialize with first sample
specEditor.value = SAMPLES.petstore;
triggerCompilation();

// Parse and generate SDK code Reactively
function triggerCompilation() {
  const content = specEditor.value;
  try {
    const parsedObj = JSON.parse(content);
    const ir = parseOpenAPIObject(parsedObj);
    parsedIR = ir;

    // Successful state rendering
    statusBar.className = 'status-bar status-success';
    statusIcon.textContent = '✔';
    statusMessage.textContent = `Parsed successfully! "${ir.title}" v${ir.version} (${ir.models.length} Models, ${ir.endpoints.length} Endpoints)`;

    // Regenerate files for currently active tab
    renderActiveSDK();
  } catch (err: any) {
    // Error state rendering
    statusBar.className = 'status-bar status-error';
    statusIcon.textContent = '✖';
    statusMessage.textContent = `Parsing Error: ${err.message}`;
  }
}

// Handle tab switching
tabButtons.forEach((btn, index) => {
  btn.addEventListener('click', () => {
    // Update active tab visual selection
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Slide index indicator
    tabNav.setAttribute('data-active-tab', String(index));

    // Update state
    currentLang = btn.getAttribute('data-lang') || 'ts';
    renderActiveSDK();
  });
});

// Render the active tab's generated code files list and viewer
function renderActiveSDK() {
  if (!parsedIR) return;

  try {
    const files = generateSDK(parsedIR, currentLang);
    activeFilesList = files;

    // Repopulate sidebar
    fileListContainer.innerHTML = '';
    
    if (files.length === 0) {
      codeViewer.textContent = 'No files generated.';
      return;
    }

    files.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'file-item';
      if (index === 0 && (!currentActiveFilePath || !files.find(f => f.path === currentActiveFilePath))) {
        currentActiveFilePath = file.path;
      }
      
      if (file.path === currentActiveFilePath) {
        li.classList.add('active');
      }

      // Visual Code File Icon
      li.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span>${file.path.split('/').pop()}</span>
      `;

      li.addEventListener('click', () => {
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        currentActiveFilePath = file.path;
        displayCode(file.content);
      });

      fileListContainer.appendChild(li);
    });

    // Display active file
    const activeFile = files.find(f => f.path === currentActiveFilePath) || files[0];
    if (activeFile) {
      displayCode(activeFile.content);
    }
  } catch (err: any) {
    codeViewer.textContent = `Generator Error: ${err.message}`;
  }
}

// Display generated code in standard pre-highlight block
function displayCode(content: string) {
  // Simple escape for HTML formatting
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  codeViewer.innerHTML = escaped;
}

// Copy to Clipboard interaction
copyBtn.addEventListener('click', () => {
  const activeFile = activeFilesList.find(f => f.path === currentActiveFilePath);
  if (!activeFile) return;

  navigator.clipboard.writeText(activeFile.content)
    .then(() => {
      // Trigger glowing toast message
      copyToast.classList.add('show');
      setTimeout(() => {
        copyToast.classList.remove('show');
      }, 2500);
    })
    .catch(err => {
      console.error('Failed to copy code: ', err);
    });
});
