package weblab.db;

public class SQLQueries {
    public static final String CREATE_TABLE_RESULTS = """
        CREATE TABLE IF NOT EXISTS results (
            id SERIAL PRIMARY KEY,
            x DOUBLE PRECISION NOT NULL,
            y DOUBLE PRECISION NOT NULL,
            r DOUBLE PRECISION NOT NULL,
            hit BOOLEAN NOT NULL,
            session_id VARCHAR(128),
            timestamp TIMESTAMP,
            exec_time DOUBLE PRECISION
        );
    """;

    public static final String INSERT_RESULT = """
        INSERT INTO results (x, y, r, hit, session_id, timestamp, exec_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """;

    public static final String SELECT_ALL_RESULTS = """
        SELECT x, y, r, hit, session_id, timestamp, exec_time 
        FROM results 
        ORDER BY timestamp DESC;
    """;

    public static final String SELECT_RESULTS_BY_SESSION = """
        SELECT x, y, r, hit, session_id, timestamp, exec_time 
        FROM results 
        WHERE session_id = ? 
        ORDER BY timestamp DESC;
    """;

    public static final String DELETE_ALL_RESULTS = """
        DELETE FROM results;
    """;

    public static final String DELETE_RESULTS_BY_SESSION = """
        DELETE FROM results WHERE session_id = ?;
    """;
}