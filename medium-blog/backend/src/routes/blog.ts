import { contentBlogInput, updateBlogInput } from "@parthvats1/medium-common";
import { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";

export const blogRoute = new Hono<{
    Bindings: {
      DATABASE_URL: string
      JWT_SECRET: string
    },
    Variables: {
        userId: string
    }
  }>();

  blogRoute.post('/*', async (c, next) => {
    const authHeader = await c.req.header("authorization") || "";
    const token = authHeader.split(" ")[1];

    try {
      const user = await verify(token, c.env.JWT_SECRET) || "";
      if(user){
          // @ts-ignore
          c.set("userId", user.id);
          await next();
      }
      else{
          c.status(403);
          return c.json({
              message: "You are not Logged in."
          });
      }
    } catch (error) {
      c.status(403);
      return c.json({
          message: "You are not Logged in."
      });
    }
    
  })

  blogRoute.post('/', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());

    const body = await c.req.json();
    const{ success } = contentBlogInput.safeParse(body);
    if(!success){
      c.status(411);
      return c.json({
        message: "Input format is not correct"
      })
    } 

    const authorId = c.get("userId");

    const blog = await prisma.post.create({
        data:{
            title: body.title,
            content: body.content,
            authorId: authorId,
        }
    })

    return c.json({
        id: blog.id,
    })
  })

  blogRoute.put('/', async (c) =>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());

    const body = await c.req.json();
    const{ success } = updateBlogInput.safeParse(body);
    if(!success){
      c.status(411);
      return c.json({
        message: "Input format is not correct"
      })
    } 

    const blog = await prisma.post.update({
        where:{
            id: body.id,
        },
        data:{
            title: body.title,
            content: body.content,
        }
    })

    return c.json({
        id: blog.id,
    })
  })

  blogRoute.get('/bulk', async (c) =>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());

    const blogs = await prisma.post.findMany();

    return c.json({
        blogs,
    })
  })

  blogRoute.get('/:id', async (c) =>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());

    const id = c.req.param("id");

    try {
        const blog = await prisma.post.findFirst({
            where:{
                id: id,
            }
        })

        return c.json({
            blog
        })
    } catch (error) {
        c.status(403);
        return c.json({
            message: "Error while fetching the blog post",
        })
    }
  })

  