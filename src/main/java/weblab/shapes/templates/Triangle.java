package weblab.shapes.templates;

import weblab.models.Point;

public class Triangle implements Shape {
    private final double base;
    private final double height;

    public Triangle(double base, double height) {
        this.base = base;
        this.height = height;
    }

    @Override
    public boolean contains(Point p) {
        return p.x() >= 0 && p.y() >= 0 && p.x() <= base && p.y() <= height && p.y() <= (-height / base) * p.x() + height;
    }
}
