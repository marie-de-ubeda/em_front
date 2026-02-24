import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: "/board/overview", permanent: false } };
};

export default function BoardIndex() {
  return null;
}
