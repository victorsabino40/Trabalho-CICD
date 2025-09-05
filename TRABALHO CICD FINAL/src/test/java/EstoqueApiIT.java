import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

public class EstoqueApiIT {

    static HttpServer server;
    static String baseUrl;
    static HttpClient client;

    @BeforeAll
    static void startServer() throws Exception {
        Files.deleteIfExists(Path.of("estoque.csv"));
        Files.deleteIfExists(Path.of("movimentacoes.csv"));
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/api", new EstoqueServer.ApiHandler());
        server.start();
        int port = server.getAddress().getPort();
        baseUrl = "http://localhost:" + port + "/api";
        client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @AfterAll
    static void stopServer() {
        if (server != null) server.stop(0);
    }

    String GET(String path) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .header("Accept","application/json")
                .GET().build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
    }

    HttpResponse<String> GETresp(String path) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .header("Accept","application/json")
                .GET().build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    HttpResponse<String> OPTIONS(String path) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    String POST(String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .header("Content-Type","application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
    }

    HttpResponse<String> POSTresp(String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .header("Content-Type","application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    String PATCH(String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .header("Content-Type","application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
    }

    HttpResponse<String> PATCHresp(String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .header("Content-Type","application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    HttpResponse<String> PUTresp(String path) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .PUT(HttpRequest.BodyPublishers.noBody())
                .build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    HttpResponse<String> DELETEresp(String path) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .DELETE().build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    String extract(String json, String key) {
        String k = "\"" + key + "\"";
        int i = json.indexOf(k);
        if (i < 0) return null;
        int c = json.indexOf(":", i + k.length());
        int p = c + 1;
        while (p < json.length() && Character.isWhitespace(json.charAt(p))) p++;
        if (p >= json.length()) return null;
        if (json.charAt(p) == '"') {
            int q = json.indexOf('"', p + 1);
            while (q > 0 && json.charAt(q-1) == '\\') q = json.indexOf('"', q + 1);
            return json.substring(p + 1, q);
        } else {
            int q = p;
            while (q < json.length() && ",}\n\r".indexOf(json.charAt(q)) == -1) q++;
            return json.substring(p, q).trim();
        }
    }

    @Test
    void healthEndpoint() throws Exception {
        var r = GETresp("");
        assertEquals(200, r.statusCode());
        assertTrue(r.body().contains("\"status\""));
    }

    @Test
    void fullProductFlow() throws Exception {
        String body = POST("/produtos", "{\"nome\":\"Mouse Gamer\",\"preco\":129.90,\"quantidade\":10}");
        assertTrue(body.contains("\"nome\":\"Mouse Gamer\""));
        String id = extract(body, "id");
        assertNotNull(id);

        String list = GET("/produtos");
        assertTrue(list.contains(id));

        String one = GET("/produtos/" + id);
        assertTrue(one.contains("\"id\":\"" + id + "\""));

        String p2 = PATCH("/produtos/" + id + "/preco", "{\"novoPreco\":119.90}");
        assertTrue(p2.contains("119.9"));

        String p3 = PATCH("/produtos/" + id + "/renomear", "{\"novoNome\":\"Mouse Sem Fio\"}");
        assertTrue(p3.contains("\"nome\":\"Mouse Sem Fio\""));

        String p4 = PATCH("/produtos/" + id + "/quantidade", "{\"novaQuantidade\":3}");
        assertTrue(p4.contains("\"quantidade\":3"));
        assertTrue(p4.contains("\"estoqueBaixo\":true"));

        String p5 = POST("/produtos/" + id + "/vendas", "{\"quantidade\":1}");
        assertTrue(p5.contains("\"quantidade\":2"));
        assertTrue(p5.contains("\"ultimaSaida\""));

        String movs = GET("/movimentacoes");
        assertTrue(movs.contains("\"tipo\":\"ENTRADA\""));
        assertTrue(movs.contains("\"tipo\":\"SAIDA\""));

        var del = DELETEresp("/produtos/" + id);
        assertEquals(204, del.statusCode());

        var notFound = GETresp("/produtos/" + id);
        assertEquals(404, notFound.statusCode());
    }

    @Test
    void buscarEOrdenar() throws Exception {
        String id1 = extract(POST("/produtos", "{\"nome\":\"A\",\"preco\":10.00,\"quantidade\":1}"), "id");
        String id2 = extract(POST("/produtos", "{\"nome\":\"B\",\"preco\":20.00,\"quantidade\":2}"), "id");
        String id3 = extract(POST("/produtos", "{\"nome\":\"C\",\"preco\":15.00,\"quantidade\":3}"), "id");

        String byPreco = GET("/produtos?ordenarPor=preco");
        int iA = byPreco.indexOf(id1);
        int iC = byPreco.indexOf(id3);
        int iB = byPreco.indexOf(id2);
        assertTrue(iA < iC && iC < iB);

        String buscar = GET("/produtos?buscar=B");
        assertTrue(buscar.contains(id2));
        assertFalse(buscar.contains(id1));
    }

    @Test
    void configLimite() throws Exception {
        var get = GETresp("/config/limite-baixa");
        assertEquals(200, get.statusCode());
        assertTrue(get.body().contains("limiteBaixa"));

        var put = PUTresp("/config/limite-baixa/3");
        assertEquals(200, put.statusCode());
        assertTrue(put.body().contains("3"));
    }

    @Test
    void corsOptions() throws Exception {
        var r = OPTIONS("/produtos");
        assertEquals(204, r.statusCode());
        assertTrue(r.headers().firstValue("Access-Control-Allow-Origin").orElse("").contains("*"));
    }
}
