package weblab.shapes;

import weblab.shapes.factories.ShapeFactory;

public class QuadrantShapeTemplate {
    private final ShapeFactory factory;
    private final int quadrant;

    public QuadrantShapeTemplate(ShapeFactory factory, int quadrant) {
        this.factory = factory;
        this.quadrant = quadrant;
    }

    public ShapeFactory getFactory() {
        return factory;
    }

    public int getQuadrant() {
        return quadrant;
    }
}
