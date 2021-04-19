import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  const handleNextPage = async (nextPageUrl: string): Promise<void> => {
    fetch(nextPageUrl)
      .then(response => response.json())
      .then(responseJson => {
        const resultsPosts = responseJson.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          };
        });
        if (!responseJson.next_page) {
          setNextPage(null);
        }
        setPosts([...posts, ...resultsPosts]);
      });
  };
  return (
    <>
      <Head>
        <title>Home | Spacetraveling</title>
      </Head>
      <Header />
      <main className={commonStyles.container}>
        <div className={styles.posts}>
          {posts.map(post => (
            <article key={post.uid}>
              <Link href={`/post/${post.uid}`}>
                <a>
                  <strong>{post.data.title}</strong>
                  <p>{post.data.subtitle}</p>
                  <span>
                    <time>
                      <img
                        src="/images/calendar.svg"
                        alt="Ícone - Calendário"
                      />
                      {format(
                        new Date(post.first_publication_date),
                        'dd MMM yyyy',
                        {
                          locale: ptBR,
                        }
                      )}
                    </time>
                    <span>
                      <img src="/images/user.svg" alt="Ícone - Pessoa" />
                      {post.data.author}
                    </span>
                  </span>
                </a>
              </Link>
            </article>
          ))}
          {nextPage !== null && (
            <button
              type="button"
              className={styles.loadMorePosts}
              onClick={() => handleNextPage(nextPage)}
            >
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title,post.subtitle,post.author'],
    }
  );
  const results = postsResponse.results.map(post => {
    return {
      data: {
        author: post.data.author,
        subtitle: post.data.subtitle,
        title: post.data.title,
      },
      uid: post.uid,
      first_publication_date: post.first_publication_date,
    };
  });

  const { next_page } = postsResponse;

  return {
    props: {
      postsPagination: {
        results,
        next_page,
      },
    },
  };
};
