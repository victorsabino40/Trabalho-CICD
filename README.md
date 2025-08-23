# Frontend – Controle de Estoque
Este frontend HTML/CSS/JS consome a API fornecida no seu ZIP (`EstoqueServer.java`).

## Como executar o backend
1. Abra o projeto Java do ZIP em um terminal.
2. Compile (via Maven) e execute o servidor (porta 8080):

```bash
# dentro do projeto do servidor
mvn -q -DskipTests package
java -cp target/classes EstoqueServer
# o console deve exibir: http://localhost:8080
```

> Opcional (se preferir e tiver plugin configurado):  
> `mvn exec:java -Dexec.mainClass=EstoqueServer`

## Como usar o frontend
1. Depois do backend estar rodando em `http://localhost:8080`, abra o arquivo `index.html` desta pasta no seu navegador (clique duas vezes ou use um servidor estático).
2. Recursos prontos:
   - Listagem com busca e ordenação (nome, preço, quantidade, data de entrada, última saída)
   - Cadastro de produto
   - Vender (cria movimentação de saída)
   - Alterar preço
   - Renomear produto
   - Ajustar quantidade (valor absoluto)
   - Remoção de produto
   - Exibição do histórico de movimentações
   - Configuração do limite de estoque baixo

> A API já expõe CORS liberado. Se desejar mudar a URL base, defina `window.API_BASE` antes do `app.js`.

## Endpoints usados
- `GET /api/produtos?buscar=&ordenarPor=`
- `POST /api/produtos`  (body: `{ nome, preco, quantidade }`)
- `GET /api/produtos/{id}`
- `DELETE /api/produtos/{id}`
- `POST /api/produtos/{id}/vendas`  (body: `{ quantidade }`)
- `PATCH /api/produtos/{id}/preco`  (body: `{ novoPreco }`)
- `PATCH /api/produtos/{id}/renomear`  (body: `{ novoNome }`)
- `PATCH /api/produtos/{id}/quantidade` (body: `{ novaQuantidade }`)
- `GET /api/movimentacoes`
- `GET /api/config/limite-baixa`
- `PUT /api/config/limite-baixa/{valor}`

## Observações
- O visual é responsivo e em PT‑BR, seguindo seu estilo preferido (querySelector e arrow functions).
- O alerta “Estoque baixo” aparece quando `quantidade <= limite` informado pela API.
