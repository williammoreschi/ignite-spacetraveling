import { Fragment } from 'react';
import Head from 'next/head';
import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';

import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

import Header from '../../components/Header';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function Post({ post }: PostProps) {
  const router = useRouter();

  const readingTime = Math.ceil(
    post.data.content.reduce((total, contentItem) => {
      const heading = contentItem.heading.split(' ');
      const body = RichText.asText(contentItem.body).split(' ');
      return total + (body.length + heading.length);
    }, 0) / 200
  );

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | Spacetraveling</title>
      </Head>
      <Header />
      <div className={styles.banner}>
        <img src={post.data.banner.url} alt="" />
      </div>
      <main className={commonStyles.container}>
        <article>
          <header className={styles.headerPost}>
            <h1>{post.data.title}</h1>
            <span>
              <time>
                <img src="/images/calendar.svg" alt="Ícone - Calendário" />
                {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </time>
              <span>
                <img src="/images/user.svg" alt="Ícone - Pessoa" />
                {post.data.author}
              </span>
              <span>
                <img src="/images/clock.svg" alt="Ícone - Relógio" />
                {readingTime} min
              </span>
            </span>
          </header>
          <section className={styles.postContent}>
            {post.data.content.map((c, i) => (
              <Fragment key={i}>
                <h1>{c.heading}</h1>
                <div
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(c.body),
                  }}
                />
              </Fragment>
            ))}
          </section>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title,post.subtitle,post.author'],
      pageSize: 6,
    }
  );
  const paths = posts.results.map(post => ({
    params: {
      slug: post.uid,
    },
  }));
  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      author: response.data.author,
      title: response.data.title,
      subtitle: response.data.subtitle,
      content: response.data.content.map(c => ({
        heading: c.heading,
        body: [...c.body],
      })),
      banner: {
        url: response.data.banner.url,
      },
    },
  };
  return {
    props: {
      post,
    },
    redirect: 60 * 30, // 30 minutes
  };
};
