package weblab.services;

import weblab.models.CheckResult;
import weblab.models.Point;
import weblab.shapes.QuadrantShapeTemplate;
import weblab.shapes.templates.QuadrantShape;
import weblab.shapes.templates.Shape;

import java.util.ArrayList;
import java.util.List;

public class AreaCheckService {
    private final List<QuadrantShapeTemplate> shapeTemplates;

    public AreaCheckService(List<QuadrantShapeTemplate> shapeTemplates) {
        this.shapeTemplates = shapeTemplates;
    }

    public List<CheckResult> checkPoints(List<Point> points) {
        List<CheckResult> results = new ArrayList<>();
        for (Point p : points) {
            List<Shape> shapesForPoint = new ArrayList<>();
            for (QuadrantShapeTemplate template : shapeTemplates) {
                shapesForPoint.add(new QuadrantShape(template.getFactory().create(p.r()), template.getQuadrant()));
            }
            HitChecker checker = new HitChecker(shapesForPoint);
            results.add(new CheckResult(p, checker.isHit(p)));
        }
        return results;
    }
}
