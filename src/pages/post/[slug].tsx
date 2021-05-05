import { Fragment } from 'react';
import Head from 'next/head';
import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';

import { useRouter } from 'next/router';
import Link from 'next/link';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

import Header from '../../components/Header';
import Utteranc from '../../components/Utteranc';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  prevSlug: string | null;
  prevTitle: string | null;
  nextSlug: string | null;
  nextTitle: string | null;
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
  preview: boolean;
}

export default function Post({ post, preview }: PostProps): JSX.Element {
  const router = useRouter();

  const readingTime = Math.ceil(
    post.data.content.reduce((total, contentItem) => {
      const heading = String(contentItem.heading).split(' ');
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
            <span>
              * editado em{' '}
              {format(
                new Date(post.first_publication_date),
                "d MMM yyyy, 'ás' HH:mm",
                {
                  locale: ptBR,
                }
              )}
            </span>
          </header>
          <section className={styles.postContent}>
            {post.data.content.map((c, i) => (
              <Fragment key={String(i)}>
                <h1>{c.heading}</h1>
                <div
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: RichText.asHtml(c.body) }}
                />
              </Fragment>
            ))}
          </section>
          <hr className={styles.hr} />
          <nav className={styles.navContainer}>
            <div>
              <p>{post.prevTitle}</p>

              {!post.prevSlug ? (
                ''
              ) : (
                <Link href={`/post/${post.prevSlug}`}>
                  <a>
                    <button type="button" className={styles.nextPage}>
                      Post anterior
                    </button>
                  </a>
                </Link>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              <p>{post.nextTitle}</p>

              {!post.nextSlug ? (
                ''
              ) : (
                <Link href={`/post/${post.nextSlug}`}>
                  <a>
                    <button type="button" className={styles.nextPage}>
                      Próximo post
                    </button>
                  </a>
                </Link>
              )}
            </div>
          </nav>
          <Utteranc />
          {preview && (
            <aside>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
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

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const prevpost = (
    await prismic.query(Prismic.predicates.at('document.type', 'post'), {
      fetch: ['post.title'],
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    })
  ).results[0];

  const nextpost = (
    await prismic.query(Prismic.predicates.at('document.type', 'post'), {
      fetch: ['post.title'],
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date desc]',
    })
  ).results[0];

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    prevSlug: !prevpost ? null : prevpost.uid,
    prevTitle: !prevpost ? null : prevpost.data.title,
    nextSlug: !nextpost ? null : nextpost.uid,
    nextTitle: !nextpost ? null : nextpost.data.title,
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
      preview,
    },
    redirect: 60 * 30, // 30 minutes
  };
};
