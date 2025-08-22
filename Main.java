import java.io.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class Main {

    static final class Ansi {
        static final String RESET = "\u001B[0m";
        static final String BOLD = "\u001B[1m";
        static final String DIM = "\u001B[2m";
        static final String RED = "\u001B[31m";
        static final String GREEN = "\u001B[32m";
        static final String YELLOW = "\u001B[33m";
        static final String BLUE = "\u001B[34m";
        static final String CYAN = "\u001B[36m";
        static String color(String s, String c){ return c + s + RESET; }
        static String bold(String s){ return BOLD + s + RESET; }
        static String dim(String s){ return DIM + s + RESET; }
    }

    static final class Produto {
        private final String id;
        private String nome;
        private BigDecimal preco;
        private int quantidade;
        private final LocalDate dataEntrada;
        private LocalDateTime ultimaSaida;

        private Produto(String id, String nome, BigDecimal preco, int quantidade, LocalDate dataEntrada, LocalDateTime ultimaSaida) {
            this.id = id;
            this.nome = nome;
            this.preco = preco.setScale(2, RoundingMode.HALF_UP);
            this.quantidade = quantidade;
            this.dataEntrada = dataEntrada;
            this.ultimaSaida = ultimaSaida;
        }

        public static Produto novo(String nome, BigDecimal preco, int quantidade) {
            return new Produto(UUID.randomUUID().toString(), nome.trim(), preco, quantidade, LocalDate.now(), null);
        }

        public String getId() { return id; }
        public String getNome() { return nome; }
        public void setNome(String nome) { this.nome = nome.trim(); }
        public BigDecimal getPreco() { return preco; }
        public void setPreco(BigDecimal preco) { this.preco = preco.setScale(2, RoundingMode.HALF_UP); }
        public int getQuantidade() { return quantidade; }
        public LocalDate getDataEntrada() { return dataEntrada; }
        public LocalDateTime getUltimaSaida() { return ultimaSaida; }

        public void vender(int qtd) {
            if (qtd <= 0) throw new IllegalArgumentException("Quantidade deve ser positiva.");
            if (qtd > quantidade) throw new IllegalArgumentException("Estoque insuficiente.");
            quantidade -= qtd;
            ultimaSaida = LocalDateTime.now();
        }
    }

    enum TipoMov { ENTRADA, SAIDA }

    static final class Movimentacao {
        final String idProduto;
        final String nomeProduto;
        final TipoMov tipo;
        final int quantidade;
        final BigDecimal valorUnitario;
        final LocalDateTime dataHora = LocalDateTime.now();
        Movimentacao(String idProduto, String nomeProduto, TipoMov tipo, int quantidade, BigDecimal valorUnitario) {
            this.idProduto = idProduto;
            this.nomeProduto = nomeProduto;
            this.tipo = tipo;
            this.quantidade = quantidade;
            this.valorUnitario = valorUnitario.setScale(2, RoundingMode.HALF_UP);
        }
    }

    static final class RepoCsv {
        private static final Path PROD_CSV = Paths.get("estoque.csv");
        private static final Path MOV_CSV  = Paths.get("movimentacoes.csv");
        private static final DateTimeFormatter D = DateTimeFormatter.ISO_LOCAL_DATE;
        private static final DateTimeFormatter DT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

        static void salvar(Collection<Produto> produtos, List<Movimentacao> historico) {
            try {
                try (BufferedWriter w = Files.newBufferedWriter(PROD_CSV)) {
                    w.write("id;nome;preco;quantidade;dataEntrada;ultimaSaida\n");
                    for (var p : produtos) {
                        w.write(String.join(";",
                                esc(p.getId()),
                                esc(p.getNome()),
                                p.getPreco().toPlainString(),
                                Integer.toString(p.getQuantidade()),
                                p.getDataEntrada().format(D),
                                p.getUltimaSaida() != null ? p.getUltimaSaida().format(DT) : ""
                        ));
                        w.write("\n");
                    }
                }
                try (BufferedWriter w = Files.newBufferedWriter(MOV_CSV)) {
                    w.write("idProduto;nomeProduto;tipo;quantidade;valorUnit;dataHora\n");
                    for (var m : historico) {
                        w.write(String.join(";",
                                esc(m.idProduto),
                                esc(m.nomeProduto),
                                m.tipo.name(),
                                Integer.toString(m.quantidade),
                                m.valorUnitario.toPlainString(),
                                m.dataHora.format(DT)
                        ));
                        w.write("\n");
                    }
                }
            } catch (IOException e) {
                System.out.println(Ansi.color("Falha ao salvar CSV: " + e.getMessage(), Ansi.RED));
            }
        }

        static LoadResult carregar() {
            Map<String, Produto> mapa = new LinkedHashMap<>();
            List<Movimentacao> movs = new ArrayList<>();
            if (Files.exists(PROD_CSV)) {
                try (BufferedReader r = Files.newBufferedReader(PROD_CSV)) {
                    String line = r.readLine();
                    while ((line = r.readLine()) != null) {
                        var cols = parse(line);
                        String id = unesc(cols.get(0));
                        String nome = unesc(cols.get(1));
                        BigDecimal preco = new BigDecimal(cols.get(2));
                        int qtd = Integer.parseInt(cols.get(3));
                        LocalDate entrada = LocalDate.parse(cols.get(4), D);
                        LocalDateTime saida = cols.size() > 5 && !cols.get(5).isBlank()
                                ? LocalDateTime.parse(cols.get(5), DT) : null;
                        Produto p = new Produto(id, nome, preco, qtd, entrada, saida);
                        mapa.put(id, p);
                    }
                } catch (Exception e) {
                    System.out.println(Ansi.color("Falha ao carregar estoque.csv: " + e.getMessage(), Ansi.RED));
                }
            }
            if (Files.exists(MOV_CSV)) {
                try (BufferedReader r = Files.newBufferedReader(MOV_CSV)) {
                    String line = r.readLine();
                    while ((line = r.readLine()) != null) {
                        var cols = parse(line);
                        Movimentacao m = new Movimentacao(
                                unesc(cols.get(0)),
                                unesc(cols.get(1)),
                                TipoMov.valueOf(cols.get(2)),
                                Integer.parseInt(cols.get(3)),
                                new BigDecimal(cols.get(4))
                        );
                        movs.add(m);
                    }
                } catch (Exception e) {
                    System.out.println(Ansi.color("Falha ao carregar movimentacoes.csv: " + e.getMessage(), Ansi.RED));
                }
            }
            return new LoadResult(mapa, movs);
        }

        record LoadResult(Map<String, Produto> produtos, List<Movimentacao> historico) {}

        private static String esc(String s) {
            if (s == null) return "";
            return s.replace("\\","\\\\").replace(";","\\;").replace("\n","\\n");
        }
        private static String unesc(String s) {
            return s.replace("\\n","\n").replace("\\;",";").replace("\\\\","\\");
        }
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

    static final class Estoque {
        private final Map<String, Produto> produtos = new LinkedHashMap<>();
        private final List<Movimentacao> historico = new ArrayList<>();
        private int limiteBaixaQtd = 5;

        public void setLimiteBaixaQtd(int limite) {
            if (limite < 0) throw new IllegalArgumentException("Limite inválido.");
            this.limiteBaixaQtd = limite;
        }

        public void putLoaded(Produto p){ produtos.put(p.getId(), p); }

        public Produto cadastrar(String nome, BigDecimal preco, int quantidade) {
            if (nome == null || nome.isBlank()) throw new IllegalArgumentException("Nome obrigatório.");
            if (preco == null || preco.signum() < 0) throw new IllegalArgumentException("Preço inválido.");
            if (quantidade < 0) throw new IllegalArgumentException("Quantidade inválida.");
            Produto p = Produto.novo(nome, preco, quantidade);
            produtos.put(p.getId(), p);
            historico.add(new Movimentacao(p.getId(), p.getNome(), TipoMov.ENTRADA, quantidade, preco));
            checarBaixa(p, true);
            return p;
        }

        public void vender(String idProduto, int qtd) {
            Produto p = produtos.get(idProduto);
            if (p == null) throw new IllegalArgumentException("Produto não encontrado.");
            p.vender(qtd);
            historico.add(new Movimentacao(p.getId(), p.getNome(), TipoMov.SAIDA, qtd, p.getPreco()));
            checarBaixa(p, false);
        }

        public void alterarPreco(String idProduto, BigDecimal novo) {
            Produto p = produtos.get(idProduto);
            if (p == null) throw new IllegalArgumentException("Produto não encontrado.");
            if (novo.signum() < 0) throw new IllegalArgumentException("Preço inválido.");
            p.setPreco(novo);
        }

        public Collection<Produto> todos() { return produtos.values(); }
        public List<Movimentacao> historico() { return historico; }
        public Optional<Produto> buscarPorId(String id){ return Optional.ofNullable(produtos.get(id)); }

        public List<Produto> buscarPorNome(String termo){
            String t = termo.toLowerCase(Locale.ROOT);
            return produtos.values().stream()
                    .filter(p -> p.getNome().toLowerCase(Locale.ROOT).contains(t))
                    .toList();
        }

        private void checarBaixa(Produto p, boolean silencioso) {
            if (p.getQuantidade() <= limiteBaixaQtd) {
                String msg = "Estoque baixo para \"" + p.getNome() + "\" (qtd " + p.getQuantidade() + " ≤ limite " + limiteBaixaQtd + ")";
                if (!silencioso) System.out.println(Ansi.color("⚠ " + msg, Ansi.YELLOW));
            }
        }
    }

    private static final Scanner in = new Scanner(System.in);

    public static void main(String[] args) {
        var load = RepoCsv.carregar();
        Estoque estoque = new Estoque();
        load.produtos().values().forEach(estoque::putLoaded);
        estoque.historico().addAll(load.historico());
        header();
        loop(estoque);
        RepoCsv.salvar(estoque.todos(), estoque.historico());
        System.out.println(Ansi.color("Dados salvos em estoque.csv e movimentacoes.csv. Até logo!", Ansi.CYAN));
    }

    private static void header() {
        System.out.println(Ansi.bold("╔════════════════════════════════════════════╗"));
        System.out.println(Ansi.bold("║        CONTROLE DE ESTOQUE (Console)       ║"));
        System.out.println(Ansi.bold("╚════════════════════════════════════════════╝"));
        System.out.println(Ansi.dim("Java 17+ • BigDecimal • CSV • ANSI UI\n"));
    }

    private static void loop(Estoque estoque) {
        boolean run = true;
        while (run) {
            System.out.println(Ansi.bold("""
                [1] Cadastrar produto
                [2] Vender produto
                [3] Alterar preço
                [4] Listar produtos
                [5] Buscar por nome
                [6] Ordenar listagem
                [7] Histórico de movimentações
                [8] Ajustar limite de baixa
                [0] Sair
                """));
            System.out.print(Ansi.color("Escolha: ", Ansi.BLUE));
            String op = in.nextLine().trim();
            try {
                switch (op) {
                    case "1" -> cadastrarUI(estoque);
                    case "2" -> venderUI(estoque);
                    case "3" -> alterarPrecoUI(estoque);
                    case "4" -> listarUI(estoque, List.of(), "nome");
                    case "5" -> buscarUI(estoque);
                    case "6" -> ordenarUI(estoque);
                    case "7" -> historicoUI(estoque);
                    case "8" -> ajustarLimiteUI(estoque);
                    case "0" -> run = false;
                    default -> System.out.println(Ansi.color("Opção inválida.", Ansi.RED));
                }
            } catch (Exception e) {
                System.out.println(Ansi.color("Erro: " + e.getMessage(), Ansi.RED));
            }
            System.out.println();
        }
    }

    private static void cadastrarUI(Estoque e) {
        System.out.print("Nome: ");
        String nome = in.nextLine().trim();
        BigDecimal preco = lerBig("Preço (R$): ");
        int qtd = lerInt("Quantidade: ");
        Produto p = e.cadastrar(nome, preco, qtd);
        System.out.println(Ansi.color("✔ Produto cadastrado: " + p.getNome() +
                " (ID " + p.getId().substring(0,8) + ") em " + p.getDataEntrada(), Ansi.GREEN));
    }

    private static void venderUI(Estoque e) {
        var prod = selecionarProduto(e);
        int qtd = lerInt("Quantidade a vender: ");
        confirma("Confirmar venda de %d un de \"%s\"?".formatted(qtd, prod.getNome()));
        e.vender(prod.getId(), qtd);
        System.out.println(Ansi.color("✔ Venda registrada. Quantidade atual: " + prod.getQuantidade() +
                " • Última saída: " + (prod.getUltimaSaida() + "").replace('T',' '), Ansi.GREEN));
    }

    private static void alterarPrecoUI(Estoque e) {
        var prod = selecionarProduto(e);
        BigDecimal novo = lerBig("Novo preço (R$): ");
        e.alterarPreco(prod.getId(), novo);
        System.out.println(Ansi.color("✔ Preço atualizado para R$ " + prod.getPreco(), Ansi.GREEN));
    }

    private static void listarUI(Estoque e, List<Produto> base, String ordenarPor) {
        List<Produto> lista = base.isEmpty() ? new ArrayList<>(e.todos()) : new ArrayList<>(base);
        Comparator<Produto> comp = switch (ordenarPor) {
            case "preco" -> Comparator.comparing(Produto::getPreco);
            case "quantidade" -> Comparator.comparingInt(Produto::getQuantidade);
            case "entrada" -> Comparator.comparing(Produto::getDataEntrada);
            default -> Comparator.comparing(Produto::getNome, String.CASE_INSENSITIVE_ORDER);
        };
        lista.sort(comp);
        if (lista.isEmpty()) { System.out.println(Ansi.dim("Nenhum produto.")); return; }
        String[] header = {"ID", "Produto", "Preço", "Qtd", "Entrada", "Última saída"};
        int[] widths = {8, 22, 10, 5, 12, 19};
        printRow(header, widths, true);
        for (var p : lista) {
            String lowFlag = p.getQuantidade() <= 5 ? Ansi.color("↓", Ansi.YELLOW) : "";
            String[] row = {
                    p.getId().substring(0, 8),
                    p.getNome(),
                    "R$ " + p.getPreco(),
                    (p.getQuantidade() + " " + lowFlag).trim(),
                    p.getDataEntrada().toString(),
                    p.getUltimaSaida() != null ? p.getUltimaSaida().toString().replace('T',' ') : "-"
            };
            printRow(row, widths, false);
        }
    }

    private static void buscarUI(Estoque e) {
        System.out.print("Buscar por nome (termo): ");
        String termo = in.nextLine().trim();
        var res = e.buscarPorNome(termo);
        if (res.isEmpty()) System.out.println(Ansi.color("Nenhum produto corresponde ao termo.", Ansi.YELLOW));
        else listarUI(e, res, "nome");
    }

    private static void ordenarUI(Estoque e) {
        System.out.print("Ordenar por [nome|preco|quantidade|entrada]: ");
        String o = in.nextLine().trim().toLowerCase(Locale.ROOT);
        if (!Set.of("nome","preco","quantidade","entrada").contains(o)) {
            System.out.println(Ansi.color("Opção inválida.", Ansi.RED)); return;
        }
        listarUI(e, List.of(), o);
    }

    private static void historicoUI(Estoque e) {
        if (e.historico().isEmpty()) { System.out.println(Ansi.dim("Sem movimentações.")); return; }
        String[] h = {"Data/Hora", "Tipo", "Produto", "Qtd", "Preço"};
        int[] w = {19, 8, 24, 5, 10};
        printRow(h, w, true);
        for (var m : e.historico()) {
            String tipo = m.tipo == TipoMov.ENTRADA ? Ansi.color("ENTRADA", Ansi.CYAN) : Ansi.color("SAÍDA", Ansi.BLUE);
            String[] row = {
                    m.dataHora.toString().replace('T',' '),
                    tipo,
                    m.nomeProduto,
                    Integer.toString(m.quantidade),
                    "R$ " + m.valorUnitario
            };
            printRow(row, w, false);
        }
        BigDecimal totalSaidas = e.historico().stream()
                .filter(m -> m.tipo == TipoMov.SAIDA)
                .map(m -> m.valorUnitario.multiply(BigDecimal.valueOf(m.quantidade)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        System.out.println(Ansi.bold("Total em vendas registradas: ") + Ansi.color("R$ " + totalSaidas.setScale(2, RoundingMode.HALF_UP), Ansi.GREEN));
    }

    private static void ajustarLimiteUI(Estoque e) {
        int novo = lerInt("Novo limite de baixa quantidade: ");
        e.setLimiteBaixaQtd(novo);
        System.out.println(Ansi.color("✔ Limite atualizado para " + novo, Ansi.GREEN));
    }

    private static Produto selecionarProduto(Estoque e) {
        if (e.todos().isEmpty()) throw new IllegalStateException("Não há produtos.");
        List<Produto> list = new ArrayList<>(e.todos());
        for (int i = 0; i < list.size(); i++) {
            Produto p = list.get(i);
            System.out.printf("%s%2d)%s %s (ID %s) - qtd %d, R$ %s%n",
                    Ansi.BOLD, i+1, Ansi.RESET, p.getNome(), p.getId().substring(0,8), p.getQuantidade(), p.getPreco());
        }
        int idx = lerInt("Selecione o nº do produto: ") - 1;
        if (idx < 0 || idx >= list.size()) throw new IllegalArgumentException("Seleção inválida.");
        return list.get(idx);
    }

    private static BigDecimal lerBig(String prompt) {
        while (true) {
            System.out.print(prompt);
            var s = in.nextLine().trim().replace(",", ".");
            try { return new BigDecimal(s).setScale(2, RoundingMode.HALF_UP); }
            catch (Exception ex) { System.out.println(Ansi.color("Valor inválido.", Ansi.RED)); }
        }
    }

    private static int lerInt(String prompt) {
        while (true) {
            System.out.print(prompt);
            var s = in.nextLine().trim();
            try { return Integer.parseInt(s); }
            catch (Exception ex) { System.out.println(Ansi.color("Digite um inteiro.", Ansi.RED)); }
        }
    }

    private static void confirma(String msg){
        System.out.print(Ansi.color(msg + " [s/N]: ", Ansi.YELLOW));
        String s = in.nextLine().trim().toLowerCase(Locale.ROOT);
        if (!s.equals("s") && !s.equals("sim")) throw new RuntimeException("Operação cancelada.");
    }

    private static void printRow(String[] cols, int[] widths, boolean header){
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cols.length; i++) {
            String c = cols[i];
            int w = widths[i];
            sb.append(pad(c, w)).append("  ");
        }
        String line = sb.toString();
        if (header) {
            System.out.println(Ansi.bold(line));
            System.out.println(Ansi.dim("-".repeat(Math.min(100, line.length()))));
        } else {
            System.out.println(line);
        }
    }

    private static String pad(String s, int w){
        if (s.length() > w) return s.substring(0, Math.max(0,w-1)) + "…";
        return s + " ".repeat(Math.max(0, w - s.length()));
    }
}

