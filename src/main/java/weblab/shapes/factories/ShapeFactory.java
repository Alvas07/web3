package weblab.shapes.factories;

import weblab.shapes.templates.Shape;

public interface ShapeFactory {
    Shape create(double r);
}
