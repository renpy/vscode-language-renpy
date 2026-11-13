## Python syntax from 3.9 through 3.15, for manually checking highlighting in python blocks.

init python:
    lazy import json
    lazy from pathlib import Path
    lazy = 1
    flat = [*L for L in lists]
    merged = {**d for d in dicts}
    gen = (*L for L in lists)
    type Point = tuple[float, float]
    type ListOrSet[T] = list[T] | set[T]
    def first[T](xs: list[T]) -> T:
        return xs[0]
    def pos(a, b, /, c, *, d):
        pass
    class Box[T: int = int](Base):
        pass
    class Plain[T]:
        pass
    template = t"Try some {variety} cheese!"
    raw_template = rt"\d{x}" + TR'''{y}'''
    try:
        pass
    except TimeoutError, ConnectionRefusedError:
        pass
    except* ValueError as eg:
        pass
    match command:
        case +1:
            pass
        case [x, *rest]:
            pass
    @buttons[0].clicked.connect
    def handler():
        pass
    def variadic(*args: *Ts):
        pass
    with (open("a") as a, open("b") as b):
        pass
    after = "still fine"
