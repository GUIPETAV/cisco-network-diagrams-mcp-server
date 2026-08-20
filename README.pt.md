# Servidor MCP de Diagramas de Rede Cisco

Um servidor [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) que expõe os 308 ícones oficiais da Iconografia Corporativa Cisco Systems (RGB-fixo) para construção de diagramas de topologia de rede.

## 📋 Descrição

Este projeto implementa um servidor MCP que fornece acesso programático aos ícones oficiais da Cisco para uso em diagramas de rede. Perfeito para ferramentas de automação, serviços de geração de diagramas e assistentes de IA que precisam criar visualizações de topologias de rede com iconografia autêntica da Cisco.

## ✨ Características

- 🎨 **308 ícones oficiais** da Cisco Systems Corporate Iconography (RGB-fixo)
- 🔌 **Compatível com MCP** - Integra-se facilmente com ferramentas que suportam Model Context Protocol
- 📦 **Pronto para produção** - Implementado em TypeScript com tipagem forte
- 🚀 **Fácil de usar** - CLI simples e API clara
- 📝 **MIT License** - Código aberto e livre para uso

## 🛠️ Requisitos

- Node.js >= 18

## 📦 Instalação

```bash
npm install cisco-network-diagrams-mcp-server
```

Ou instale globalmente:

```bash
npm install -g cisco-network-diagrams-mcp-server
```

## 🚀 Uso

### Iniciando o servidor

```bash
cisco-network-diagrams-mcp-server
```

Ou em modo desenvolvimento:

```bash
npm run dev
```

### Compilação

Para compilar o projeto TypeScript:

```bash
npm run build
```

## 📁 Estrutura do Projeto

```
.
├── src/              # Código-fonte TypeScript
├── dist/             # Código compilado
├── assets/           # Ícones e recursos
├── package.json      # Configuração do projeto
└── tsconfig.json     # Configuração do TypeScript
```

## 📚 Desenvolvimento

### Scripts disponíveis

- `npm run dev` - Inicia em modo desenvolvimento com recarregamento automático
- `npm run build` - Compila o TypeScript
- `npm run start` - Executa o servidor compilado
- `npm run clean` - Remove a pasta `dist`

### Dependências principais

- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - SDK do Model Context Protocol
- [zod](https://zod.dev/) - Validação de esquemas TypeScript

## 🔧 Configuração

O servidor pode ser configurado através de variáveis de ambiente ou arquivo de configuração. Consulte a documentação MCP para mais detalhes.

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📞 Suporte

Para dúvidas ou problemas, abra uma [issue](https://github.com/GUIPETAV/cisco-network-diagrams-mcp-server/issues) no repositório.

---

**Nota**: Este projeto utiliza os ícones oficiais da Cisco Systems Corporate Iconography. Certifique-se de respeitar os termos de uso da Cisco ao utilizar estes recursos.
