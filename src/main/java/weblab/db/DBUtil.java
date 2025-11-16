package weblab.db;

import javax.naming.InitialContext;
import javax.naming.NamingException;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public class DBUtil {
    public static DataSource ds;

    static {
        try {
            InitialContext ctx = new InitialContext();
            ds = (DataSource) ctx.lookup("java:/jdbc/web3DB");

            createTableIfNotExists();
        } catch (NamingException | SQLException e) {
            e.printStackTrace();
        }
    }

    public static Connection getConnection() throws SQLException {
        if (ds == null) throw new SQLException("DataSource is not initialized");
        return ds.getConnection();
    }

    private static void createTableIfNotExists() throws SQLException {
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute(SQLQueries.CREATE_TABLE_RESULTS);
        }
    }
}
