package weblab.models;

import java.io.Serial;
import java.io.Serializable;

public record Point(double x, double y, double r) implements Serializable {
    @Serial
    private static final long serialVersionUID = 32069245872435L;
}