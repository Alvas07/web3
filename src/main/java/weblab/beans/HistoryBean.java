package weblab.beans;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Named;
import weblab.dao.ResultDAO;
import weblab.models.HistoryEntry;

import java.util.List;

@Named("historyBean")
@ApplicationScoped
public class HistoryBean {
    private final ResultDAO dao = new ResultDAO();

    public List<HistoryEntry> getAllResults() {
        return dao.getAllResults();
    }

    public List<HistoryEntry> getResultsBySession(String sessionID) {
        return dao.getResultsBySession(sessionID);
    }

    public void saveBatch(List<HistoryEntry> entries) {
        dao.saveResultsBatch(entries);
    }

    public void removeResultsBySession(String sessionID) {
        dao.removeResultsBySession(sessionID);
    }

    public void clearResults() {
        dao.clearResults();
    }

    public void clearAll() {
        jakarta.faces.context.FacesContext context = jakarta.faces.context.FacesContext.getCurrentInstance();
        if (context != null && context.getExternalContext() != null) {
            String sessionID = context.getExternalContext().getSessionId(false);
            if (sessionID != null) {
                removeResultsBySession(sessionID);
                return;
            }
        }
        clearResults();
    }

    public List<HistoryEntry> getEntries() {
        jakarta.faces.context.FacesContext context = jakarta.faces.context.FacesContext.getCurrentInstance();
        if (context != null && context.getExternalContext() != null) {
            String sessionID = context.getExternalContext().getSessionId(false);
            if (sessionID != null) {
                return getResultsBySession(sessionID);
            }
        }
        return getAllResults();
    }
}
