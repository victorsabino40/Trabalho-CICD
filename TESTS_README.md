# Testes Automatizados — Estoque API

## Requisitos
- Java 17+
- Maven 3.9+

## Executar testes
```bash
mvn -q -DskipTests=false test
```

Os testes sob `src/test/java/EstoqueApiIT.java` sobem um servidor HTTP real em porta aleatória, exercitam todas as rotas e validam as respostas.
