# Catálogo de tecnologias | Front-end

Interface em HTML, CSS e JavaScript com Vite. O login obtém um JWT da API. A tela principal permite cadastrar, listar, editar e excluir tecnologias.

| Nome | Base | Tempo de aprendizado |
| --- | --- | --- |
| Laravel | PHP | 3 meses |

O tempo acima é um exemplo de preenchimento. A tabela começa vazia e mostra os registros salvos pela API no MongoDB.

## Rodar localmente

Requisitos: Node.js 24 ou superior e o projeto `tecnologias-api` em execução.

No PowerShell, dentro da pasta do front-end:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

No Bash, use `cp .env.example .env` para copiar o arquivo.

Abra `http://localhost:5173` e entre com o usuário e a senha definidos no `.env` da API. O endereço padrão da API é `http://127.0.0.1:3001`. Se a API rodar em outro endereço, ajuste `VITE_API_URL` e reinicie o Vite. O token fica na sessão da aba e é removido ao sair.

Para gerar os arquivos de produção, execute `npm run build`. A saída fica em `dist/`. Use `npm run preview` com o servidor de desenvolvimento parado para testar essa saída.
