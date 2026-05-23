# SDKGenerator

🛡️ **Cast typed client SDKs from OpenAPI specifications instantly.**

[![Language](https://img.shields.io/badge/Language-TypeScript-blue.svg)](#)
[![Targets](https://img.shields.io/badge/Targets-TypeScript%20%7C%20Python%20%7C%20Go%20%7C%20Ruby%20%7C%20Java-magenta.svg)](#)
[![Platform](https://img.shields.io/badge/Platform-Node.js%20%7C%20Browser-orange.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#)

`SDKGenerator` is an elegant, polyglot OpenAPI client library generator. It parses an OpenAPI spec (v3.0 or v3.1) and outputs beautifully styled, fully typed client libraries in **TypeScript**, **Python**, **Go**, **Ruby**, and **Java**.

⚡ **Try it live**: [https://frankstop.github.io/SDKGenerator/](https://frankstop.github.io/SDKGenerator/)

---

## 🎯 Use Cases

`SDKGenerator` solves the painful problem of manually maintaining client-server bindings across different parts of a modern software stack.

### 1. Unified Microservices Communication
If you have a backend written in **Go**, a frontend in **TypeScript**, data engineering pipelines in **Python**, and legacy billing services in **Java**, keeping API clients synchronized is a nightmare. `SDKGenerator` parses your central OpenAPI spec and outputs matching, type-safe clients for all five platforms in under a second.

### 2. CI/CD Automated Publishing
Integrate the CLI directly into your deployment pipeline. Whenever an OpenAPI specification is updated in your repository, a CI action automatically triggers `SDKGenerator`, compiles the code, and publishes the new typed packages directly to your private registries (NPM, PyPI, Go Proxy, Maven Central, RubyGems).

### 3. Standardized HTTP Security & Headers
Enforces company-wide HTTP client standards across all teams. All generated clients come pre-configured out-of-the-box with matching header handling, standard timeouts (30s), consistent authentication protocols (Bearer tokens & API keys), and structured network exception formatting.

### 4. Interactive Sandbox Testing
Offers product managers, QA analysts, and developers a serverless browser sandbox. Paste any OpenAPI spec on the left side, instantly type-check, and copy target client code segments on the right side without requiring local terminal set up or code checkouts.

---

## 🛠️ CLI Usage

`SDKGenerator` compiles into a zero-dependency CLI executable.

### Installation & Execution
Generate SDKs directly using `npx`:

```bash
# Generate ALL five client packages (TS, Python, Go, Ruby, Java) into ./sdk
npx sdk-generator openapi.json

# Generate only a specific language client
npx sdk-generator openapi.json ts

# Specify a custom output folder
npx sdk-generator openapi.json python -o ./my-client
```

---

## 📂 Generated Package Structures

Unlike simple code snippet tools, `SDKGenerator` outputs a **fully packaged, publish-ready module** for each target environment:

*   **TypeScript**: Complete package with `package.json`, `tsconfig.json`, `index.ts`, custom `client.ts` fetch wrappers, and clean `models.ts` interfaces.
*   **Python**: A modern setup using `pyproject.toml`, complete module initializers (`__init__.py`), Pydantic v2 `BaseModel` models, and a `requests` client.
*   **Go**: Standard library `net/http` and `context` client matching clean JSON struct tags and a `go.mod` declaration.
*   **Ruby**: A fully-fledged gem layout with a `.gemspec` file, accessor-supported class models, and `Net::HTTP` requests.
*   **Java**: Maven `pom.xml`, builder-pattern-enabled model POJOs, and a standard `java.net.http.HttpClient` client.

---

- **Offline First**: All parsing and generation code runs client-side in your browser. No server backend required.

---

## 📄 License

This project is licensed under the MIT License.
