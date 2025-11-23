package weblab.shapes.factories;

import weblab.shapes.templates.Shape;
import weblab.shapes.templates.Triangle;

public class TriangleFactory implements ShapeFactory {
    private final double baseRatio;
    private final double heightRatio;

    public TriangleFactory(double baseRatio, double heightRatio) {
        this.baseRatio = baseRatio;
        this.heightRatio = heightRatio;
    }

    @Override
    public Shape create(double r) {
        return new Triangle(baseRatio*r, heightRatio*r);
    }
}
