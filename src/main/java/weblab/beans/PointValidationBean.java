package weblab.beans;

import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Named;
import weblab.models.Point;

import java.util.Arrays;

@Named("pointValidationBean")
@RequestScoped
public class PointValidationBean {
    private static final double[] R_VALUES = {1, 1.5, 2, 2.5, 3};
    private static final int[] Y_VALUES = {-3, -2, -1, 0, 1, 2, 3, 4, 5};
    private static final double X_MIN = -3;
    private static final double X_MAX = 5;
    private static final double EPSILON = 1e-6;

    public boolean validateForm(Point point) {
        if (point == null) return false;

        boolean validX = point.x() >= X_MIN - EPSILON && point.x() <= X_MAX + EPSILON;

        boolean validY = Arrays.stream(Y_VALUES)
                .anyMatch(y -> Math.abs(point.y() - y) <= EPSILON);

        boolean validR = Arrays.stream(R_VALUES)
                .anyMatch(r -> Math.abs(point.r() - r) <= EPSILON);

        return validX && validY && validR;
    }

    public boolean validateGraphClick(Point point, double graphXMin, double graphXMax, double graphYMin, double graphYMax) {
        if (point == null) return false;

        boolean validX = point.x() >= graphXMin - EPSILON && point.x() <= graphXMax + EPSILON;

        boolean validY = point.y() >= graphYMin - EPSILON && point.y() <= graphYMax + EPSILON;

        boolean validR = Arrays.stream(R_VALUES)
                .anyMatch(r -> Math.abs(point.r() - r) <= EPSILON);

        return validX && validY && validR;
    }
}
