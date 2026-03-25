#!/usr/bin/env python3
import asyncio

from database import init_db, close_db


async def main():
    await init_db()
    await close_db()
    print("Seed complete (users/categories/system settings ensured)")


if __name__ == "__main__":
    asyncio.run(main())
