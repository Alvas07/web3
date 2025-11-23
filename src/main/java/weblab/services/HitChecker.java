package weblab.services;

import weblab.models.Point;
import weblab.shapes.templates.Shape;

import java.util.List;

public class HitChecker {
    private final List<Shape> shapes;

    public HitChecker(List<Shape> shapes) {
        this.shapes = shapes;
    }

    public boolean isHit(Point p) {
        return shapes.stream().anyMatch(s -> s.contains(p));
    }
}
