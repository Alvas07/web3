package weblab.dao;

import weblab.models.HistoryEntry;
import weblab.models.Point;
import weblab.db.DBUtil;
import weblab.db.SQLQueries;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ResultDAO {
    public void saveResultsBatch(List<HistoryEntry> entries) {
        try (Connection conn = DBUtil.getConnection()) {
            conn.setAutoCommit(false);
            try (PreparedStatement ps = conn.prepareStatement(SQLQueries.INSERT_RESULT)) {
                for (HistoryEntry entry : entries) {
                    Point p = entry.point();
                    ps.setDouble(1, p.x());
                    ps.setDouble(2, p.y());
                    ps.setDouble(3, p.r());
                    ps.setBoolean(4, entry.result());
                    ps.setString(5, entry.sessionId());
                    ps.setTimestamp(6, Timestamp.valueOf(entry.timestamp()));
                    ps.setDouble(7, entry.execTime());
                    ps.addBatch();
                }

                ps.executeBatch();
                conn.commit();
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }


    private List<HistoryEntry> getResultsBySQL(String sql, String sessionId) {
        List<HistoryEntry> results = new ArrayList<>();
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            if (sessionId != null) stmt.setString(1, sessionId);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    double x = rs.getDouble("x");
                    double y = rs.getDouble("y");
                    double r = rs.getDouble("r");
                    boolean hit = rs.getBoolean("hit");
                    String sID = rs.getString("session_id");
                    Timestamp ts = rs.getTimestamp("timestamp");
                    double execTime = rs.getDouble("exec_time");

                    results.add(new HistoryEntry(new Point(x, y, r), hit, ts.toLocalDateTime(), execTime, sID));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return results;
    }

    public List<HistoryEntry> getAllResults() {
        return getResultsBySQL(SQLQueries.SELECT_ALL_RESULTS, null);
    }

    public List<HistoryEntry> getResultsBySession(String sessionID) {
        return getResultsBySQL(SQLQueries.SELECT_RESULTS_BY_SESSION, sessionID);
    }

    public void removeResultsBySession(String sessionID) {
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement stmt = conn.prepareStatement(SQLQueries.DELETE_RESULTS_BY_SESSION)) {
            stmt.setString(1, sessionID);
            stmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public void clearResults() {
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement stmt = conn.prepareStatement(SQLQueries.DELETE_ALL_RESULTS)) {
            stmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
