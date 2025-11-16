package weblab.beans;

import jakarta.enterprise.context.RequestScoped;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import weblab.models.CheckResult;
import weblab.models.HistoryEntry;
import weblab.models.Point;
import weblab.services.AreaCheckService;
import weblab.shapes.QuadrantShapeTemplate;
import weblab.shapes.factories.QuarterCircleFactory;
import weblab.shapes.factories.RectangleFactory;
import weblab.shapes.factories.TriangleFactory;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Named("pointCheckBean")
@RequestScoped
public class PointCheckBean {
    @Inject
    private PointValidationBean validationBean;

    @Inject
    private HistoryBean historyBean;

    private List<Point> points = new ArrayList<>();
    private boolean graphClick = false;
    private final AreaCheckService areaCheckService = new AreaCheckService(List.of(
            new QuadrantShapeTemplate(new TriangleFactory(1.0, 0.5), 1),
            new QuadrantShapeTemplate(new RectangleFactory(1.0, 1.0), 2),
            new QuadrantShapeTemplate(new QuarterCircleFactory(0.5), 4)
    ));

    private String selectedX;
    private Double selectedY;
    private boolean[] rValues = new boolean[5];

    private Double graphX;
    private Double graphY;
    private Double graphR;

    public List<Point> getPoints() { return points; }
    public void setPoints(List<Point> points) { this.points = points; }

    public boolean isGraphClick() { return graphClick; }
    public void setGraphClick(boolean graphClick) { this.graphClick = graphClick; }

    public String getSelectedX() { return selectedX; }
    public void setSelectedX(String selectedX) { this.selectedX = selectedX; }

    public Double getSelectedY() { return selectedY; }
    public void setSelectedY(Double selectedY) { this.selectedY = selectedY; }

    public boolean[] getRValues() { return rValues; }
    public void setRValues(boolean[] rValues) { this.rValues = rValues; }
    
    // Именованные свойства для JSF
    public boolean getZero() { return rValues[0]; }
    public void setZero(boolean value) { rValues[0] = value; }

    public boolean getOne() { return rValues[1]; }
    public void setOne(boolean value) { rValues[1] = value; }

    public boolean getTwo() { return rValues[2]; }
    public void setTwo(boolean value) { rValues[2] = value; }

    public boolean getThree() { return rValues[3]; }
    public void setThree(boolean value) { rValues[3] = value; }

    public boolean getFour() { return rValues[4]; }
    public void setFour(boolean value) { rValues[4] = value; }

    public Double getGraphX() { return graphX; }
    public void setGraphX(Double graphX) { this.graphX = graphX; }

    public Double getGraphY() { return graphY; }
    public void setGraphY(Double graphY) { this.graphY = graphY; }

    public Double getGraphR() { return graphR; }
    public void setGraphR(Double graphR) { this.graphR = graphR; }

    public void submitFromGraph() {
        FacesContext context = FacesContext.getCurrentInstance();
        
        if (graphX == null || graphY == null || graphR == null) {
            context.addMessage(null, 
                new FacesMessage(FacesMessage.SEVERITY_ERROR, "Не удалось получить координаты из графика", null));
            return;
        }

        String sessionID = context.getExternalContext().getSessionId(false);
        if (sessionID == null) {
            sessionID = context.getExternalContext().getSessionId(true);
        }

    double x = Math.max(-6.0, Math.min(6.0, graphX));
    double y = Math.max(-6.0, Math.min(6.0, graphY));

        double[] validR = {1.0, 1.5, 2.0, 2.5, 3.0};
        boolean validRValue = false;
        double rValue = graphR;
        for (double r : validR) {
            if (Math.abs(graphR - r) < 1e-6) {
                validRValue = true;
                rValue = r;
                break;
            }
        }
        
        if (!validRValue) {
            context.addMessage(null, new FacesMessage(FacesMessage.SEVERITY_ERROR,
                    String.format("Некорректное значение R: %.3f", graphR), null));
            return;
        }

        Point point = new Point(x, y, rValue);

        LocalDateTime timestamp = LocalDateTime.now();
        long start = System.nanoTime();

        List<CheckResult> results = areaCheckService.checkPoints(List.of(point));

        double execTime = (System.nanoTime() - start) / 1e6;

        String finalSessionID = sessionID;
        List<HistoryEntry> entries = results.stream()
                .map(res -> new HistoryEntry(res.point(), res.hit(), timestamp, execTime, finalSessionID))
                .toList();

        historyBean.saveBatch(entries);
    }

    public void submitForm(int y) {
        FacesContext context = FacesContext.getCurrentInstance();
        String sessionID = context.getExternalContext().getSessionId(false);
        if (sessionID == null) {
            sessionID = context.getExternalContext().getSessionId(true);
        }

        double[] rMappings = {1.0, 1.5, 2.0, 2.5, 3.0};
        List<Double> selectedRValues = new ArrayList<>();
        for (int i = 0; i < rValues.length && i < rMappings.length; i++) {
            if (rValues[i]) selectedRValues.add(rMappings[i]);
        }

        if (selectedX == null || selectedX.trim().isEmpty()) {
            context.addMessage(null, new FacesMessage(FacesMessage.SEVERITY_ERROR, "Введите X", null));
            return;
        }

        if (selectedRValues.isEmpty()) {
            context.addMessage(null, new FacesMessage(FacesMessage.SEVERITY_ERROR, "Выберите хотя бы одно значение R", null));
            return;
        }

        double x;
        try {
            x = Double.parseDouble(selectedX.trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            context.addMessage(null, new FacesMessage(FacesMessage.SEVERITY_ERROR, "Некорректное значение X", null));
            return;
        }

        double yValue = (double) y;

        List<Point> pointsToCheck = selectedRValues.stream()
                .map(r -> new Point(x, yValue, r))
                .toList();

        List<Point> invalidPoints = pointsToCheck.stream()
                .filter(p -> !validationBean.validateForm(p))
                .toList();

        if (!invalidPoints.isEmpty()) {
            String message = invalidPoints.stream()
                    .map(p -> String.format("(x=%.3f, y=%.3f, r=%.3f)", p.x(), p.y(), p.r()))
                    .collect(Collectors.joining("; "));
            context.addMessage(null,
                    new FacesMessage(FacesMessage.SEVERITY_ERROR,
                            "Некорректные точки: " + message, null));
            return;
        }

        LocalDateTime timestamp = LocalDateTime.now();
        long start = System.nanoTime();

        List<CheckResult> results = areaCheckService.checkPoints(pointsToCheck);

        double execTime = (System.nanoTime() - start) / 1e6;

        String finalSessionID = sessionID;
        List<HistoryEntry> entries = results.stream()
                .map(r -> new HistoryEntry(r.point(), r.hit(), timestamp, execTime, finalSessionID))
                .toList();

        historyBean.saveBatch(entries);
    }

    public void submitPoints(double graphXMin, double graphXMax, double graphYMin, double graphYMax, String sessionID) {
        FacesContext context = FacesContext.getCurrentInstance();

        if (points == null || points.isEmpty()) {
            context.addMessage(null, new FacesMessage(FacesMessage.SEVERITY_ERROR, "Нет точек для проверки", null));
            return;
        }

        List<Point> invalidPoints = points.stream()
                .filter(p -> graphClick
                        ? !validationBean.validateGraphClick(p, graphXMin, graphXMax, graphYMin, graphYMax)
                        : !validationBean.validateForm(p))
                .toList();

        if (!invalidPoints.isEmpty()) {
            String message = invalidPoints.stream()
                    .map(p -> String.format("(x=%.3f, y=%.3f, r=%.3f)", p.x(), p.y(), p.r()))
                    .collect(Collectors.joining("; "));
            context.addMessage(null,
                    new FacesMessage(FacesMessage.SEVERITY_ERROR,
                            "Некорректные точки: " + message, null));
            return;
        }

        LocalDateTime timestamp = LocalDateTime.now();
        long start = System.nanoTime();

        List<CheckResult> results = areaCheckService.checkPoints(points);

        double execTime = (System.nanoTime() - start) / 1e6;

        List<HistoryEntry> entries = results.stream()
                .map(r -> new HistoryEntry(r.point(), r.hit(), timestamp, execTime, sessionID))
                .toList();

        historyBean.saveBatch(entries);
    }
}
