import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

public class EstoqueServer {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/api", new ApiHandler());
        server.setExecutor(null);
        Store.loadFromDisk();
        Runtime.getRuntime().addShutdownHook(new Thread(Store::saveToDisk));
        server.start();
        System.out.println("http://localhost:8080");
    }

    static final class Produto {
        private final String id;
        private String nome;
        private BigDecimal preco;
        private int quantidade;
        private final LocalDate dataEntrada;
        private LocalDateTime ultimaSaida;

        Produto(String id, String nome, BigDecimal preco, int quantidade, LocalDate entrada, LocalDateTime ultimaSaida) {
            this.id = id;
            this.nome = nome.trim();
            this.preco = preco.setScale(2, RoundingMode.HALF_UP);
            this.quantidade = quantidade;
            this.dataEntrada = entrada;
            this.ultimaSaida = ultimaSaida;
        }

        static Produto novo(String nome, BigDecimal preco, int quantidade) {
            return new Produto(UUID.randomUUID().toString(), nome, preco, quantidade, LocalDate.now(), null);
        }

        String getId() { return id; }
        String getNome() { return nome; }
        BigDecimal getPreco() { return preco; }
        int getQuantidade() { return quantidade; }
        LocalDate getDataEntrada() { return dataEntrada; }
        LocalDateTime getUltimaSaida() { return ultimaSaida; }
        void setNome(String n) { this.nome = n.trim(); }
        void setPreco(BigDecimal p) { this.preco = p.setScale(2, RoundingMode.HALF_UP); }
        void setQuantidade(int q) { this.quantidade = q; }
        void registrarSaidaAgora() { this.ultimaSaida = LocalDateTime.now(); }
    }

    static final class Movimentacao {
        enum Tipo { ENTRADA, SAIDA }
        private LocalDateTime dataHora;
        private final Tipo tipo;
        private final String idProduto;
        private final String nomeProduto;
        private final int quantidade;
        private final BigDecimal valorUnitario;

        Movimentacao(Tipo tipo, String idProduto, String nomeProduto, int quantidade, BigDecimal valorUnitario) {
            this.dataHora = LocalDateTime.now();
            this.tipo = tipo;
            this.idProduto = idProduto;
            this.nomeProduto = nomeProduto;
            this.quantidade = quantidade;
            this.valorUnitario = valorUnitario.setScale(2, RoundingMode.HALF_UP);
        }

        LocalDateTime getDataHora() { return dataHora; }
        String getTipo() { return tipo.name(); }
        String getIdProduto() { return idProduto; }
        String getNomeProduto() { return nomeProduto; }
        int getQuantidade() { return quantidade; }
        BigDecimal getValorUnitario() { return valorUnitario; }
        void setDataHora(LocalDateTime t) { this.dataHora = t; }
    }

    static final class Store {
        private static final Map<String, Produto> PRODUTOS = new ConcurrentHashMap<>();
        private static final List<Movimentacao> MOVS = new CopyOnWriteArrayList<>();
        private static volatile int LIMITE_BAIXA = 5;
        private static final Path PROD = Paths.get("estoque.csv");
        private static final Path MOV = Paths.get("movimentacoes.csv");
        private static final DateTimeFormatter D = DateTimeFormatter.ISO_LOCAL_DATE;
        private static final DateTimeFormatter DT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

        static Collection<Produto> produtos() { return PRODUTOS.values(); }
        static Optional<Produto> get(String id) { return Optional.ofNullable(PRODUTOS.get(id)); }
        static List<Movimentacao> historico() { return MOVS; }
        static int getLimiteBaixa() { return LIMITE_BAIXA; }
        static void setLimiteBaixa(int v) { LIMITE_BAIXA = Math.max(0, v); }

        static Produto cadastrar(String nome, BigDecimal preco, int quantidade) {
            if (nome == null || nome.isBlank()) throw new IllegalArgumentException("nome inválido");
            if (preco == null || preco.signum() < 0) throw new IllegalArgumentException("preço inválido");
            if (quantidade < 0) throw new IllegalArgumentException("quantidade inválida");
            var p = Produto.novo(nome, preco, quantidade);
            PRODUTOS.put(p.getId(), p);
            MOVS.add(new Movimentacao(Movimentacao.Tipo.ENTRADA, p.getId(), p.getNome(), quantidade, p.getPreco()));
            return p;
        }

        static Produto vender(String id, int quantidade) {
            var p = get(id).orElseThrow(() -> new NoSuchElementException("produto não encontrado"));
            if (quantidade <= 0) throw new IllegalArgumentException("quantidade deve ser positiva");
            if (quantidade > p.getQuantidade()) throw new IllegalArgumentException("estoque insuficiente");
            p.setQuantidade(p.getQuantidade() - quantidade);
            p.registrarSaidaAgora();
            MOVS.add(new Movimentacao(Movimentacao.Tipo.SAIDA, p.getId(), p.getNome(), quantidade, p.getPreco()));
            return p;
        }

        static Produto alterarPreco(String id, BigDecimal novo) {
            var p = get(id).orElseThrow(() -> new NoSuchElementException("produto não encontrado"));
            if (novo == null || novo.signum() < 0) throw new IllegalArgumentException("preço inválido");
            p.setPreco(novo);
            return p;
        }

        static Produto renomear(String id, String novo) {
            var p = get(id).orElseThrow(() -> new NoSuchElementException("produto não encontrado"));
            if (novo == null || novo.isBlank()) throw new IllegalArgumentException("nome inválido");
            p.setNome(novo);
            return p;
        }

        static Produto ajustarQuantidade(String id, int novaQuantidade) {
            var p = get(id).orElseThrow(() -> new NoSuchElementException("produto não encontrado"));
            if (novaQuantidade < 0) throw new IllegalArgumentException("quantidade inválida");
            int delta = novaQuantidade - p.getQuantidade();
            p.setQuantidade(novaQuantidade);
            if (delta > 0) MOVS.add(new Movimentacao(Movimentacao.Tipo.ENTRADA, p.getId(), p.getNome(), delta, p.getPreco()));
            return p;
        }

        static void remover(String id) {
            var p = PRODUTOS.remove(id);
            if (p == null) throw new NoSuchElementException("produto não encontrado");
        }

        static void saveToDisk() {
            try {
                try (BufferedWriter w = Files.newBufferedWriter(PROD, StandardCharsets.UTF_8)) {
                    w.write("id;nome;preco;quantidade;dataEntrada;ultimaSaida\n");
                    for (var p : produtos()) {
                        String saida = p.getUltimaSaida() != null ? p.getUltimaSaida().format(DT) : "";
                        w.write(String.join(";", esc(p.getId()), esc(p.getNome()), p.getPreco().toPlainString(),
                                Integer.toString(p.getQuantidade()), p.getDataEntrada().format(D), saida));
                        w.write("\n");
                    }
                }
                try (BufferedWriter w = Files.newBufferedWriter(MOV, StandardCharsets.UTF_8)) {
                    w.write("dataHora;tipo;idProduto;nomeProduto;quantidade;valorUnitario\n");
                    for (var m : historico()) {
                        w.write(String.join(";", m.getDataHora().format(DT), m.getTipo(), esc(m.getIdProduto()), esc(m.getNomeProduto()),
                                Integer.toString(m.getQuantidade()), m.getValorUnitario().toPlainString()));
                        w.write("\n");
                    }
                }
            } catch (IOException ignored) {}
        }

        static void loadFromDisk() {
            if (Files.exists(PROD)) {
                try (BufferedReader r = Files.newBufferedReader(PROD, StandardCharsets.UTF_8)) {
                    String line = r.readLine();
                    while ((line = r.readLine()) != null) {
                        var cols = parse(line);
                        String id = unesc(cols.get(0));
                        String nome = unesc(cols.get(1));
                        BigDecimal preco = new BigDecimal(cols.get(2));
                        int qtd = Integer.parseInt(cols.get(3));
                        LocalDate entrada = LocalDate.parse(cols.get(4), D);
                        LocalDateTime saida = cols.size() > 5 && !cols.get(5).isBlank() ? LocalDateTime.parse(cols.get(5), DT) : null;
                        PRODUTOS.put(id, new Produto(id, nome, preco, qtd, entrada, saida));
                    }
                } catch (Exception ignored) {}
            }
            if (Files.exists(MOV)) {
                try (BufferedReader r = Files.newBufferedReader(MOV, StandardCharsets.UTF_8)) {
                    String line = r.readLine();
                    while ((line = r.readLine()) != null) {
                        var cols = parse(line);
                        LocalDateTime dh = LocalDateTime.parse(cols.get(0), DT);
                        Movimentacao.Tipo tipo = Movimentacao.Tipo.valueOf(cols.get(1));
                        String idp = unesc(cols.get(2));
                        String nomep = unesc(cols.get(3));
                        int qtd = Integer.parseInt(cols.get(4));
                        BigDecimal val = new BigDecimal(cols.get(5));
                        Movimentacao m = new Movimentacao(tipo, idp, nomep, qtd, val);
                        m.setDataHora(dh);
                        MOVS.add(m);
                    }
                } catch (Exception ignored) {}
            }
        }

        private static String esc(String s) { return s.replace("\\","\\\\").replace(";","\\;").replace("\n","\\n"); }
        private static String unesc(String s) { return s.replace("\\n","\n").replace("\\;",";").replace("\\\\","\\"); }
        private static List<String> parse(String line) {
            List<String> out = new ArrayList<>();
            StringBuilder sb = new StringBuilder();
            boolean esc = false;
            for (char c : line.toCharArray()) {
                if (esc) { sb.append(c); esc = false; }
                else if (c == '\\') esc = true;
                else if (c == ';') { out.add(sb.toString()); sb.setLength(0); }
                else sb.append(c);
            }
            out.add(sb.toString());
            return out;
        }
    }

    static final class ApiHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            try {
                addCors(ex);
                if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) { send(ex, 204, ""); return; }
                URI uri = ex.getRequestURI();
                String path = uri.getPath();
                String method = ex.getRequestMethod().toUpperCase(Locale.ROOT);
                if (path.equals("/api") || path.equals("/api/")) { send(ex, 200, json(Map.of("status","ok"))); return; }
                if (path.startsWith("/api/produtos")) { handleProdutos(ex, method, path, uri.getQuery()); return; }
                if (path.startsWith("/api/movimentacoes")) { handleMovs(ex, method); return; }
                if (path.startsWith("/api/config/limite-baixa")) { handleLimite(ex, method, path); return; }
                send(ex, 404, json(Map.of("erro","rota não encontrada")));
            } catch (Exception e) {
                send(ex, 500, json(Map.of("erro", e.getMessage())));
            } finally {
                ex.close();
            }
        }

        void handleProdutos(HttpExchange ex, String method, String path, String query) throws IOException {
            if (path.equals("/api/produtos") && method.equals("GET")) {
                Map<String,String> q = parseQuery(query);
                String buscar = q.getOrDefault("buscar", null);
                String ordenar = q.getOrDefault("ordenarPor", "nome");
                var stream = Store.produtos().stream();
                if (buscar != null && !buscar.isBlank()) {
                    String t = buscar.toLowerCase(Locale.ROOT);
                    stream = stream.filter(p -> p.getNome().toLowerCase(Locale.ROOT).contains(t));
                }
                Comparator<Produto> comp = switch (ordenar) {
                    case "preco" -> Comparator.comparing(Produto::getPreco);
                    case "quantidade" -> Comparator.comparingInt(Produto::getQuantidade);
                    case "entrada" -> Comparator.comparing(Produto::getDataEntrada);
                    default -> Comparator.comparing(p -> p.getNome().toLowerCase(Locale.ROOT));
                };
                List<Map<String,Object>> resp = new ArrayList<>();
                stream.sorted(comp).forEach(p -> resp.add(prodToMap(p)));
                send(ex, 200, json(resp));
                return;
            }
            if (path.equals("/api/produtos") && method.equals("POST")) {
                String body = readBody(ex);
                String nome = jString(body, "nome");
                BigDecimal preco = jDecimal(body, "preco");
                Integer quantidade = jInt(body, "quantidade");
                var p = Store.cadastrar(nome, preco, quantidade);
                Store.saveToDisk();
                send(ex, 200, json(prodToMap(p)));
                return;
            }
            String[] parts = path.split("/");
            if (parts.length >= 4) {
                String id = parts[3];
                if (parts.length == 4) {
                    if (method.equals("GET")) {
                        var p = Store.get(id).orElse(null);
                        if (p == null) { send(ex, 404, json(Map.of("erro","não encontrado"))); return; }
                        send(ex, 200, json(prodToMap(p)));
                        return;
                    }
                    if (method.equals("DELETE")) {
                        Store.remover(id);
                        Store.saveToDisk();
                        send(ex, 204, "");
                        return;
                    }
                }
                if (parts.length == 5) {
                    String action = parts[4];
                    if (action.equals("vendas") && method.equals("POST")) {
                        String body = readBody(ex);
                        Integer quantidade = jInt(body, "quantidade");
                        var p = Store.vender(id, quantidade);
                        Store.saveToDisk();
                        send(ex, 200, json(prodToMap(p)));
                        return;
                    }
                    if (action.equals("preco") && (method.equals("PATCH") || method.equals("POST") || method.equals("PUT"))) {
                        String body = readBody(ex);
                        BigDecimal novo = jDecimal(body, "novoPreco");
                        var p = Store.alterarPreco(id, novo);
                        Store.saveToDisk();
                        send(ex, 200, json(prodToMap(p)));
                        return;
                    }
                    if (action.equals("renomear") && (method.equals("PATCH") || method.equals("POST") || method.equals("PUT"))) {
                        String body = readBody(ex);
                        String novo = jString(body, "novoNome");
                        var p = Store.renomear(id, novo);
                        Store.saveToDisk();
                        send(ex, 200, json(prodToMap(p)));
                        return;
                    }
                    if (action.equals("quantidade") && (method.equals("PATCH") || method.equals("POST") || method.equals("PUT"))) {
                        String body = readBody(ex);
                        Integer novaQuantidade = jInt(body, "novaQuantidade");
                        var p = Store.ajustarQuantidade(id, novaQuantidade);
                        Store.saveToDisk();
                        send(ex, 200, json(prodToMap(p)));
                        return;
                    }
                }
            }
            send(ex, 404, json(Map.of("erro","rota de produtos inválida")));
        }

        void handleMovs(HttpExchange ex, String method) throws IOException {
            if (!method.equals("GET")) { send(ex, 405, json(Map.of("erro","método não permitido"))); return; }
            List<Map<String,Object>> out = new ArrayList<>();
            for (var m : Store.historico()) {
                Map<String,Object> mm = new LinkedHashMap<>();
                mm.put("dataHora", m.getDataHora().toString());
                mm.put("tipo", m.getTipo());
                mm.put("idProduto", m.getIdProduto());
                mm.put("nomeProduto", m.getNomeProduto());
                mm.put("quantidade", m.getQuantidade());
                mm.put("valorUnitario", m.getValorUnitario());
                out.add(mm);
            }
            send(ex, 200, json(out));
        }

        void handleLimite(HttpExchange ex, String method, String path) throws IOException {
            if (method.equals("GET")) {
                send(ex, 200, json(Map.of("limiteBaixa", Store.getLimiteBaixa())));
                return;
            }
            if (method.equals("PUT")) {
                String[] parts = path.split("/");
                if (parts.length >= 5) {
                    try {
                        int v = Integer.parseInt(parts[4]);
                        Store.setLimiteBaixa(v);
                        Store.saveToDisk();
                        send(ex, 200, json(Map.of("limiteBaixa", Store.getLimiteBaixa())));
                        return;
                    } catch (NumberFormatException e) {
                        send(ex, 400, json(Map.of("erro","valor inválido")));
                        return;
                    }
                }
            }
            send(ex, 405, json(Map.of("erro","não suportado")));
        }

        Map<String,String> parseQuery(String q) {
            Map<String,String> map = new HashMap<>();
            if (q == null || q.isBlank()) return map;
            for (String part : q.split("&")) {
                int i = part.indexOf('=');
                if (i > 0) {
                    String k = URLDecoder.decode(part.substring(0,i), StandardCharsets.UTF_8);
                    String v = URLDecoder.decode(part.substring(i+1), StandardCharsets.UTF_8);
                    map.put(k, v);
                } else {
                    map.put(URLDecoder.decode(part, StandardCharsets.UTF_8), "");
                }
            }
            return map;
        }

        Map<String,Object> prodToMap(Produto p) {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("nome", p.getNome());
            m.put("preco", p.getPreco());
            m.put("quantidade", p.getQuantidade());
            m.put("dataEntrada", p.getDataEntrada().toString());
            m.put("ultimaSaida", p.getUltimaSaida() != null ? p.getUltimaSaida().toString() : null);
            m.put("estoqueBaixo", p.getQuantidade() <= Store.getLimiteBaixa());
            return m;
        }

        void addCors(HttpExchange ex) {
            Headers h = ex.getResponseHeaders();
            h.add("Access-Control-Allow-Origin", "*");
            h.add("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
            h.add("Access-Control-Allow-Headers", "Content-Type");
            h.add("Content-Type", "application/json; charset=utf-8");
        }

        String readBody(HttpExchange ex) throws IOException {
            try (InputStream is = ex.getRequestBody()) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8).trim();
            }
        }

        void send(HttpExchange ex, int status, String body) throws IOException {
            byte[] b = body.getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(status, b.length);
            try (OutputStream os = ex.getResponseBody()) { os.write(b); }
        }

        String jString(String body, String key) {
            String v = jRaw(body, key);
            if (v == null) throw new IllegalArgumentException("campo \""+key+"\" obrigatório");
            if (v.startsWith("\"") && v.endsWith("\"")) v = unescapeJson(v.substring(1, v.length()-1));
            return v;
        }

        Integer jInt(String body, String key) {
            String v = jRaw(body, key);
            if (v == null) throw new IllegalArgumentException("campo \""+key+"\" obrigatório");
            try { return Integer.parseInt(v.replaceAll("[^0-9\\-]", "")); } catch (Exception e) { throw new IllegalArgumentException("campo \""+key+"\" inválido"); }
        }

        BigDecimal jDecimal(String body, String key) {
            String v = jRaw(body, key);
            if (v == null) throw new IllegalArgumentException("campo \""+key+"\" obrigatório");
            try { return new BigDecimal(v.replace(",", ".").replaceAll("[^0-9\\.-]", "")); } catch (Exception e) { throw new IllegalArgumentException("campo \""+key+"\" inválido"); }
        }

        String jRaw(String body, String key) {
            if (body == null) return null;
            String k = "\"" + key + "\"";
            int i = body.indexOf(k);
            if (i < 0) return null;
            int colon = body.indexOf(':', i + k.length());
            if (colon < 0) return null;
            int pos = colon + 1;
            while (pos < body.length() && Character.isWhitespace(body.charAt(pos))) pos++;
            if (pos >= body.length()) return null;
            char c = body.charAt(pos);
            if (c == '"') {
                StringBuilder sb = new StringBuilder();
                pos++;
                boolean esc = false;
                while (pos < body.length()) {
                    char ch = body.charAt(pos++);
                    if (esc) { sb.append(ch); esc = false; continue; }
                    if (ch == '\\') { esc = true; continue; }
                    if (ch == '"') break;
                    sb.append(ch);
                }
                return "\"" + sb.toString() + "\"";
            } else {
                StringBuilder sb = new StringBuilder();
                while (pos < body.length()) {
                    char ch = body.charAt(pos);
                    if (ch == ',' || ch == '}' || ch == '\n' || ch == '\r') break;
                    sb.append(ch);
                    pos++;
                }
                return sb.toString().trim();
            }
        }

        String unescapeJson(String s) {
            StringBuilder sb = new StringBuilder();
            boolean esc = false;
            for (int i=0;i<s.length();i++) {
                char ch = s.charAt(i);
                if (esc) {
                    if (ch=='n') sb.append('\n');
                    else if (ch=='r') sb.append('\r');
                    else if (ch=='t') sb.append('\t');
                    else sb.append(ch);
                    esc = false;
                } else if (ch=='\\') {
                    esc = true;
                } else {
                    sb.append(ch);
                }
            }
            return sb.toString();
        }

        String json(Object o) {
            if (o == null) return "null";
            if (o instanceof String s) return "\"" + s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n") + "\"";
            if (o instanceof Number || o instanceof Boolean) return o.toString();
            if (o instanceof BigDecimal bd) return bd.stripTrailingZeros().toPlainString();
            if (o instanceof LocalDate d) return json(d.toString());
            if (o instanceof LocalDateTime dt) return json(dt.toString());
            if (o instanceof Map<?,?> m) {
                StringBuilder sb = new StringBuilder("{");
                boolean first = true;
                for (var e : m.entrySet()) {
                    if (!first) sb.append(",");
                    first = false;
                    sb.append(json(e.getKey().toString())).append(":").append(json(e.getValue()));
                    }
                sb.append("}");
                return sb.toString();
            }
            if (o instanceof Collection<?> c) {
                StringBuilder sb = new StringBuilder("[");
                boolean first = true;
                for (var e : c) {
                    if (!first) sb.append(",");
                    first = false;
                    sb.append(json(e));
                }
                sb.append("]");
                return sb.toString();
            }
            return json(o.toString());
        }
    }
}

