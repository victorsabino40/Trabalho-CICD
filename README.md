# 📦 API de Controle de Estoque

API HTTP em **Java 17+** usando o servidor nativo `com.sun.net.httpserver.HttpServer`.  
Persistência em **CSV** (`estoque.csv`, `movimentacoes.csv`) com **CORS habilitado**.

> ✅ Datas automáticas: **entrada** no cadastro (`LocalDate.now()`) e **saída** na venda (`LocalDateTime.now()`).

---

## 🚀 Como executar

```bash
javac EstoqueServer.java
java EstoqueServer
```
Servidor: **http://localhost:8080**  
Base da API: **http://localhost:8080/api**

> Os dados são carregados dos CSVs na inicialização e salvos em cada alteração e no desligamento.

---

## 🗂️ Estrutura dos dados

### Produto (response)
```json
{
  "id": "e8f2a3c0-xxxx-xxxx-xxxx-a1",
  "nome": "Mouse Gamer",
  "preco": 129.9,
  "quantidade": 10,
  "dataEntrada": "2025-08-22",
  "ultimaSaida": "2025-08-22T19:25:10.123",
  "estoqueBaixo": false
}
```

### Movimentação (response)
```json
{
  "dataHora": "2025-08-22T19:25:10.123",
  "tipo": "SAIDA",
  "idProduto": "e8f2a3c0-xxxx",
  "nomeProduto": "Mouse Gamer",
  "quantidade": 2,
  "valorUnitario": 129.9
}
```

### Erro (response)
```json
{ "erro": "mensagem explicativa" }
```

---

## 🔐 Rotas

Base URL: `http://localhost:8080/api`

### 📌 Produtos

| Método | Endpoint                        | Descrição                                    | Body (JSON) |
|--------|----------------------------------|----------------------------------------------|-------------|
| GET    | `/produtos`                     | Lista produtos (com busca/ordenação)         | — |
| POST   | `/produtos`                     | Cria produto                                  | `{"nome","preco","quantidade"}` |
| GET    | `/produtos/{id}`                | Obtém produto por ID                          | — |
| DELETE | `/produtos/{id}`                | Remove produto                                | — |
| PATCH  | `/produtos/{id}/preco`          | Altera preço                                  | `{"novoPreco"}` |
| PATCH  | `/produtos/{id}/renomear`       | Renomeia produto                              | `{"novoNome"}` |
| PATCH  | `/produtos/{id}/quantidade`     | Ajusta quantidade (entrada manual)            | `{"novaQuantidade"}` |
| POST   | `/produtos/{id}/vendas`         | Registra venda (registra data/hora de saída)  | `{"quantidade"}` |

**Query params em `GET /produtos`**  
- `buscar=termo` — filtra por nome (contém)  
- `ordenarPor=nome|preco|quantidade|entrada` — ordena (padrão: `nome`)

### 📌 Movimentações
| Método | Endpoint             | Descrição                                   |
|--------|----------------------|---------------------------------------------|
| GET    | `/movimentacoes`     | Lista histórico de entradas e saídas        |

### ⚙️ Configuração
| Método | Endpoint                          | Descrição                          |
|--------|-----------------------------------|------------------------------------|
| GET    | `/config/limite-baixa`            | Obtém limite de estoque baixo      |
| PUT    | `/config/limite-baixa/{valor}`    | Define novo limite                 |

---

## 🧪 Exemplos (cURL)

### Criar produto
```bash
curl -X POST http://localhost:8080/api/produtos   -H "Content-Type: application/json"   -d '{"nome":"Mouse Gamer","preco":129.90,"quantidade":10}'
```

### Listar produtos (busca e ordenação)
```bash
curl "http://localhost:8080/api/produtos?buscar=mouse&ordenarPor=preco"
```

### Obter por ID
```bash
curl http://localhost:8080/api/produtos/<ID>
```

### Registrar venda
```bash
curl -X POST http://localhost:8080/api/produtos/<ID>/vendas   -H "Content-Type: application/json"   -d '{"quantidade":2}'
```

### Alterar preço
```bash
curl -X PATCH http://localhost:8080/api/produtos/<ID>/preco   -H "Content-Type: application/json"   -d '{"novoPreco":119.90}'
```

### Ajustar quantidade
```bash
curl -X PATCH http://localhost:8080/api/produtos/<ID>/quantidade   -H "Content-Type: application/json"   -d '{"novaQuantidade":25}'
```

### Renomear
```bash
curl -X PATCH http://localhost:8080/api/produtos/<ID>/renomear   -H "Content-Type: application/json"   -d '{"novoNome":"Mouse Sem Fio"}'
```

### Remover
```bash
curl -X DELETE http://localhost:8080/api/produtos/<ID>
```

### Histórico
```bash
curl http://localhost:8080/api/movimentacoes
```

### Limite de estoque baixo
```bash
curl http://localhost:8080/api/config/limite-baixa
curl -X PUT http://localhost:8080/api/config/limite-baixa/3
```

---

## 🧾 Persistência

- `estoque.csv`: id;nome;preco;quantidade;dataEntrada;ultimaSaida  
- `movimentacoes.csv`: dataHora;tipo;idProduto;nomeProduto;quantidade;valorUnitario

---

## 🧰 Dica de desenvolvimento

- Use ferramentas como **Postman** ou **Insomnia** com a coleção abaixo para testar as rotas rapidamente.
