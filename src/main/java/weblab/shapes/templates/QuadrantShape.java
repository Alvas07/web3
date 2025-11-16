package weblab.shapes.templates;


import weblab.models.Point;

public class QuadrantShape implements Shape {
    private final Shape shape;
    private final int quadrant;

    public QuadrantShape(Shape shape, int quadrant) {
        this.shape = shape;
        this.quadrant = quadrant;
    }

    @Override
    public boolean contains(Point p) {
        double x = p.x();
        double y = p.y();
        switch (quadrant) {
            case 2 -> x = -x;
            case 3 -> { x = -x; y = -y; }
            case 4 -> y = -y;
        }
        return shape.contains(new Point(x, y, p.r()));
    }
}
