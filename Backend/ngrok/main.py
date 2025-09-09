from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(title="Simple FastAPI for Sum", version="1.0.0")


class SumRequest(BaseModel):
    """
    输入数据格式:
    {
        "a": number,
        "b": number
    }

    数据处理方法:
    - 计算 a 与 b 的算术和: result = a + b

    输出数据格式:
    {
        "a": number,
        "b": number,
        "result": number
    }
    """

    a: float
    b: float


class SumResponse(BaseModel):
    a: float
    b: float
    result: float


@app.post("/sum", response_model=SumResponse, summary="计算两数之和")
def sum_numbers(payload: SumRequest) -> SumResponse:
    """
    输入数据格式:
    {
        "a": number,
        "b": number
    }

    数据处理方法:
    - 使用算术加法计算两数之和

    输出数据格式:
    {
        "a": number,
        "b": number,
        "result": number
    }
    """
    result_value = payload.a + payload.b
    return SumResponse(a=payload.a, b=payload.b, result=result_value)


